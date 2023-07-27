import {
  Controller,
  Get,
  Redirect,
  Query,
  BadRequestException,
  Logger,
  Put,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { Auth } from '@/auth/decorators/auth.decorator';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { TwitchTvProfile } from '../models/twitch-tv-profile';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

@Controller('twitch')
export class TwitchController {
  private logger = new Logger(TwitchController.name);

  constructor(
    private readonly twitchService: TwitchService,
    private readonly twitchAuthService: TwitchAuthService,
    private readonly authService: AuthService,
  ) {}

  @Get('auth')
  @Auth()
  @Redirect('https://id.twitch.tv/oauth2/authorize')
  authenticate(@User() user: Player) {
    try {
      const contextToken = this.authService.generateJwtToken(
        JwtTokenPurpose.context,
        user.id,
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
  @Redirect('/static/logged-in-with-twitch-tv.html')
  async authenticationCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const { id } = this.authService.verifyToken(JwtTokenPurpose.context, state);
    await this.twitchService.saveUserProfile(
      new Types.ObjectId(id) as PlayerId,
      code,
    );
  }

  @Put('disconnect')
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  async disconnect(@User() user: Player): Promise<TwitchTvProfile> {
    return await this.twitchService.deleteUserProfile(user._id);
  }

  @Get('streams')
  getStreams() {
    return this.twitchService.streams;
  }
}
