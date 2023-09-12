import { Controller, Get, Logger, Res, Req } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
// skipcq: JS-C1003
import * as passport from 'passport';
import { Environment } from '@/environment/environment';
import { AuthService } from '../services/auth.service';
import { User } from '../decorators/user.decorator';
import { Auth } from '../decorators/auth.decorator';
import { redirectUrlCookieName } from '../middleware/set-redirect-url-cookie';
import { Player } from '@/players/models/player';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { SteamApiError } from '@/steam/errors/steam-api.error';
import { InsufficientTf2InGameHoursError } from '@/players/errors/insufficient-tf2-in-game-hours.error';
import { NoEtf2lAccountError } from '@/etf2l/errors/no-etf2l-account.error';
import { AccountBannedError } from '@/players/errors/account-banned.error';
import { Request, Response } from 'express';
import { parse } from 'cookie';
import { add } from 'date-fns';
import { PlayerNameTakenError } from '@/players/errors/player-name-taken.error';

@Controller('auth')
export class AuthController {
  private logger = new Logger(AuthController.name);

  constructor(
    private environment: Environment,
    private adapterHost: HttpAdapterHost,
    private authService: AuthService,
  ) {
    // The steam return route has to be defined like that. Any nestjs route decorators
    // would screw up some request params, resulting in OpenID throwing an error.
    // https://github.com/liamcurry/passport-steam/issues/57
    this.adapterHost.httpAdapter?.get(
      '/auth/steam/return',
      (req: Request, res: Response, next) => {
        return passport.authenticate(
          'steam',
          (error: Error, player: Player) => {
            let url = this.environment.clientUrl;
            if (req.headers.cookie) {
              const cookies = parse(req.headers.cookie);
              if (
                redirectUrlCookieName in cookies &&
                !cookies[redirectUrlCookieName].includes('auth-error')
              ) {
                url = cookies[redirectUrlCookieName];
              }
            }

            if (error) {
              this.logger.warn(`Login error: ${error}`);
              const clientErrorCode = this.mapToClientError(error);
              return res.redirect(`${url}/auth-error?error=${clientErrorCode}`);
            }

            if (!player) {
              return res.sendStatus(401);
            }

            const authToken = this.authService.generateJwtToken(
              JwtTokenPurpose.auth,
              player.id,
            );
            res.cookie('auth_token', authToken, {
              expires: add(new Date(), { days: 7 }),
              httpOnly: true,
              path: '/',
            });
            return res.redirect(`${url}`);
          },
        )(req, res, next);
      },
    );
  }

  @Get('wstoken')
  @Auth()
  refreshWsToken(@User() user: Player) {
    const wsToken = this.authService.generateJwtToken(
      JwtTokenPurpose.websocket,
      user.id,
    );

    return { wsToken };
  }

  @Get('sign-out')
  @Auth()
  signOut(@Req() req: Request, @Res() res: Response) {
    const referer = req.get('referer');
    res.clearCookie('auth_token');
    return res.redirect(referer ?? this.environment.clientUrl);
  }

  // skipcq: JS-0105
  private mapToClientError(error: unknown): string {
    if (error instanceof SteamApiError) {
      switch (error.code) {
        case 403:
          this.logger.warn("player's profile must be public");
          break;

        // no default
      }

      return 'cannot verify in-game hours for TF2';
    } else if (error instanceof InsufficientTf2InGameHoursError) {
      return 'not enough tf2 hours';
    } else if (error instanceof NoEtf2lAccountError) {
      return 'no etf2l profile';
    } else if (error instanceof AccountBannedError) {
      return 'etf2l banned';
    } else if (error instanceof PlayerNameTakenError) {
      return `${error.service.toLowerCase()} name taken`;
    }
    return 'unknown';
  }
}
