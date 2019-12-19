import { Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { authenticate } from 'passport';
import { ConfigService } from '@/config/config.service';
import { AuthService } from '../services/auth.service';
import { User } from '../decorators/user.decorator';
import { Auth } from '../decorators/auth.decorator';

@Controller('auth')
export class AuthController {

  constructor(
    private configService: ConfigService,
    private adapterHost: HttpAdapterHost,
    private authService: AuthService,
  ) {
    // The steam return route has to be defined like that. Any nestjs route decorators
    // would screw up some request params, resulting in OpenID throwing an error.
    // https://github.com/liamcurry/passport-steam/issues/57
    this.adapterHost.httpAdapter.get('/auth/steam/return', (req, res, next) => {
      return authenticate('steam', (error, user) => {
        if (error) {
          return res.redirect(`${this.configService.clientUrl}/auth-error?error=${error}`);
        }

        if (!user) {
          return res.sendStatus(401);
        }

        const refreshToken = this.authService.generateJwtToken('refresh', user.id);
        const authToken = this.authService.generateJwtToken('auth', user.id);
        return res.redirect(`${this.configService.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
      })(req, res, next);
    });
  }

  @Post()
  async refreshToken(@Query('refreshToken') oldRefreshToken: string) {
    if (oldRefreshToken !== undefined) {
      const { refreshToken, authToken } = await this.authService.refreshTokens(oldRefreshToken);
      return { refreshToken, authToken };
    } else {
      throw new BadRequestException('no valid operation specified');
    }
  }

  @Get('wstoken')
  @Auth()
  refreshWsToken(@User() user) {
    const wsToken = this.authService.generateJwtToken('ws', user.id);
    return { wsToken };
  }

}
