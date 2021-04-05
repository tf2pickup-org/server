import { Injectable, HttpService, OnModuleInit, Logger } from '@nestjs/common';
import { TwitchStream } from '../models/twitch-stream';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { TwitchGateway } from '../gateways/twitch.gateway';
import { TwitchAuthService } from './twitch-auth.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { twitchTvApiEndpoint } from '@configs/urls';

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

interface TwitchGetStreamsResponse {
  data: {
    game_id: string;
    id: string;
    language: string;
    pagination: string;
    started_at: string;
    tag_ids: string;
    thumbnail_url: string;
    title: string;
    type: 'live' | '';
    user_id: string;
    user_name: string;
    viewer_count: number;
  }[];
}

@Injectable()
export class TwitchService implements OnModuleInit {
  private logger = new Logger(TwitchService.name);
  private _streams = new BehaviorSubject<TwitchStream[]>([]);

  get streams() {
    return this._streams.value;
  }

  constructor(
    private playersService: PlayersService,
    private httpService: HttpService,
    private environment: Environment,
    private twitchGateway: TwitchGateway,
    private twitchAuthService: TwitchAuthService,
    private playerBansService: PlayerBansService,
  ) {}

  onModuleInit() {
    this._streams
      .pipe(
        distinctUntilChanged((x, y) => JSON.stringify(x) === JSON.stringify(y)),
      )
      .subscribe((streams) => this.twitchGateway.emitStreamsUpdate(streams));
  }

  async fetchUserProfile(accessToken: string) {
    // https://dev.twitch.tv/docs/api/reference#get-users
    return this.httpService
      .get<TwitchGetUsersResponse>(`${twitchTvApiEndpoint}/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-ID': this.environment.twitchClientId,
        },
      })
      .pipe(map((response) => response.data.data[0]))
      .toPromise();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollUsersStreams() {
    const users = await this.playersService.getUsersWithTwitchTvAccount();
    if (users.length > 0) {
      const rawStreams = await this.fetchStreams(
        users.map((u) => u.twitchTvUser.userId),
      );
      const streams = (
        await Promise.all(
          rawStreams.map(async (s) => {
            const player = await this.playersService.findByTwitchUserId(
              s.user_id,
            );
            const bans = await this.playerBansService.getPlayerActiveBans(
              player.id,
            );
            if (bans.length > 0) {
              return null;
            } else {
              return {
                playerId: player.id,
                id: s.id,
                userName: s.user_name,
                title: s.title,
                thumbnailUrl: s.thumbnail_url,
                viewerCount: s.viewer_count,
              };
            }
          }),
        )
      ).filter((stream) => !!stream);
      this._streams.next(streams);
      this.logger.debug('streams refreshed');
    }
  }

  private async fetchStreams(users: string[]) {
    // https://dev.twitch.tv/docs/api/reference#get-streams
    return this.httpService
      .get<TwitchGetStreamsResponse>(`${twitchTvApiEndpoint}/streams`, {
        params: {
          user_id: users,
        },
        headers: {
          'Client-ID': this.environment.twitchClientId,
          Authorization: `Bearer ${await this.twitchAuthService.getAppAccessToken()}`,
        },
      })
      .pipe(map((response) => response.data.data))
      .toPromise();
  }
}
