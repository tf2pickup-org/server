import {
  Controller,
  Get,
  Redirect,
  Query,
  BadRequestException,
  Logger,
  Put,
} from '@nestjs/common';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';

@Controller('twitch')
export class TwitchController {
  private logger = new Logger(TwitchController.name);

  constructor(
    private twitchService: TwitchService,
    private twitchAuthService: TwitchAuthService,
    private playersService: PlayersService,
    private authService: AuthService,
  ) {}

  @Get('auth')
  @Redirect('https://id.twitch.tv/oauth2/authorize')
  async authenticate(@Query('token') token: string) {
    try {
      const { id } = this.authService.verifyToken(JwtTokenPurpose.auth, token);
      const contextToken = await this.authService.generateJwtToken(
        JwtTokenPurpose.context,
        id,
      );
      return { url: this.twitchAuthService.getOauthRedirectUrl(contextToken) };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof JsonWebTokenError) {
        throw new BadRequestException(e.message);
      } else {
        throw e;
      }
    }
  }

  @Get('auth/return')
  @Redirect('/logged-in-with-twitch-tv.html')
  async authenticationCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const { id } = this.authService.verifyToken(JwtTokenPurpose.context, state);
    await this.twitchService.saveUserProfile(id, code);
  }

  @Put('disconnect')
  @Auth()
  async disconnect(@User() user: Player) {
    return this.playersService.removeTwitchTvProfile(user.id);
  }

  @Get('streams')
  getStreams() {
    return this.twitchService.streams;
  }
}
