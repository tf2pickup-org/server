import { Controller, Get, Redirect, Req, Query } from '@nestjs/common';
import { TwitchService } from '../services/twitch.service';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';

@Controller('twitch')
export class TwitchController {

  constructor(
    private twitchService: TwitchService,
    private twitchAuthService: TwitchAuthService,
    private playersService: PlayersService,
  ) { }

  @Get('auth')
  @Redirect('https://id.twitch.tv/oauth2/authorize')
  authenticate() {
    return { url: this.twitchAuthService.oauthRedirectUrl };
  }

  @Get('auth/return')
  async authenticationReturn(@Query('code') code: string) {
    const token = await this.twitchAuthService.fetchToken(code);
    const userProfile = await this.twitchService.fetchUserProfile(token);
    return userProfile;
  }

  @Get('streams')
  getStreams() {
    return this.twitchService.streams;
  }

}
