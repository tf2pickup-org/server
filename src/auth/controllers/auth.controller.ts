import { Controller } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { authenticate } from 'passport';
import { ConfigService } from '@/config/config.service';
import { AuthService } from '../services/auth.service';

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

        const refreshToken = this.authService.generateJwtToken('refresh', user._id);
        const authToken = this.authService.generateJwtToken('auth', user._id);
        return res.redirect(`${this.configService.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
      })(req, res, next);
    });
  }

}
