import { Injectable, HttpService } from '@nestjs/common';
import { TwitchStream } from '../models/twitch-stream';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlayersService } from '@/players/services/players.service';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@/environment/environment';
import { tap, map } from 'rxjs/operators';

interface TwitchGetUsersResponse {
  data: {
    broadcaster_type: string;
    description: string;
    display_name: string;
    email: string;
    id: string;
    login: string;
    offline_image_url: string;
    profile_image_url: string;
    type: string;
    view_count: number;
  }[];
}

@Injectable()
export class TwitchService {

  streams: TwitchStream[];

  private readonly twitchTvApiEndpoint = this.configService.get<string>('twitchTvApiEndpoint');

  constructor(
    private playersService: PlayersService,
    private httpService: HttpService,
    private configService: ConfigService,
    private environment: Environment,
  ) { }

  async fetchUserProfile(accessToken: string) {
    // https://dev.twitch.tv/docs/api/reference#get-users
    return this.httpService.get<TwitchGetUsersResponse>(`${this.twitchTvApiEndpoint}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': this.environment.twitchClientId,
      },
    }).pipe(
      map(response => response.data.data[0]),
    ).toPromise();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollUsersStreams() {
    const users = await this.playersService.getTwitchTvUsers();
    if (users.length > 0) {
      this.httpService.get(`${this.twitchTvApiEndpoint}/streams?user_id=${users.join(',')}`, {
        headers: {
          'Client-ID': this.environment.twitchClientId,
        },
      }).pipe(
        tap(console.log),
      ).subscribe();
    }
  }

}
