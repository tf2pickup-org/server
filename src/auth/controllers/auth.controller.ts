import {
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
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
import { assertIsError } from '@/utils/assert-is-error';
import { Request } from 'express';
import { parse } from 'cookie';

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
      (req: Request, res, next) => {
        return passport.authenticate(
          'steam',
          async (error: Error, player: Player) => {
            let url = this.environment.clientUrl;
            if (req.headers.cookie) {
              const cookies = parse(req.headers.cookie);
              if (redirectUrlCookieName in cookies) {
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

            const refreshToken = await this.authService.generateJwtToken(
              JwtTokenPurpose.refresh,
              player.id,
            );
            const authToken = await this.authService.generateJwtToken(
              JwtTokenPurpose.auth,
              player.id,
            );
            return res.redirect(
              `${url}?refresh_token=${refreshToken}&auth_token=${authToken}`,
            );
          },
        )(req, res, next);
      },
    );
  }

  @Post()
  async refreshToken(@Query('refresh_token') oldRefreshToken?: string) {
    if (!oldRefreshToken) {
      throw new BadRequestException('no valid operation specified');
    }

    try {
      return await this.authService.refreshTokens(oldRefreshToken);
    } catch (error) {
      assertIsError(error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('wstoken')
  @Auth()
  async refreshWsToken(@User() user: Player) {
    const wsToken = await this.authService.generateJwtToken(
      JwtTokenPurpose.websocket,
      user.id,
    );

    return { wsToken };
  }

  // skipcq: JS-0105
  private mapToClientError(error: unknown): string {
    if (error instanceof SteamApiError) {
      switch (error.code) {
        case 403:
          this.logger.warn(`player's profile must be public`);
          break;
      }

      return 'cannot verify in-game hours for TF2';
    } else if (error instanceof InsufficientTf2InGameHoursError) {
      return 'not enough tf2 hours';
    } else if (error instanceof NoEtf2lAccountError) {
      return 'no etf2l profile';
    } else if (error instanceof AccountBannedError) {
      return 'etf2l banned';
    }
    return 'unknown';
  }
}
