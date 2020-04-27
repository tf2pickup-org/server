import { Controller, Get, Post, Query, BadRequestException, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { authenticate } from 'passport';
import { Environment } from '@/environment/environment';
import { AuthService } from '../services/auth.service';
import { User } from '../decorators/user.decorator';
import { Auth } from '../decorators/auth.decorator';

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
    this.adapterHost.httpAdapter?.get('/auth/steam/return', (req, res, next) => {
      return authenticate('steam', async (error, user) => {
        if (error) {
          this.logger.warn(`Steam login error for ${user}: ${error}`);
          return res.redirect(`${this.environment.clientUrl}/auth-error?error=${error.message}`);
        }

        if (!user) {
          return res.sendStatus(401);
        }

        const refreshToken = await this.authService.generateJwtToken('refresh', user.id);
        const authToken = await this.authService.generateJwtToken('auth', user.id);
        return res.redirect(`${this.environment.clientUrl}?refresh_token=${refreshToken}&auth_token=${authToken}`);
      })(req, res, next);
    });
  }

  @Post()
  async refreshToken(@Query('refresh_token') oldRefreshToken: string) {
    if (oldRefreshToken !== undefined) {
      try {
        const { refreshToken, authToken } = await this.authService.refreshTokens(oldRefreshToken);
        return { refreshToken, authToken };
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    } else {
      throw new BadRequestException('no valid operation specified');
    }
  }

  @Get('wstoken')
  @Auth()
  async refreshWsToken(@User() user) {
    const wsToken = await this.authService.generateJwtToken('ws', user.id);
    return { wsToken };
  }

}
