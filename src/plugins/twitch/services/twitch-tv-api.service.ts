import { Environment } from '@/environment/environment';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { TwitchAuthService } from './twitch-auth.service';
import { TwitchTvGetStreamsResponse } from '../types/twitch-tv-get-streams-response';
import { twitchTvApiEndpoint } from '@configs/urls';
import { firstValueFrom, map, zip } from 'rxjs';
import { splitToChunks } from '../utils/split-to-chunks';
import { TwitchTvGetUsersResponse } from '../types/twitch-tv-get-users-response';

@Injectable()
export class TwitchTvApiService {
  private logger = new Logger(TwitchTvApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly environment: Environment,
    private readonly twitchAuthService: TwitchAuthService,
  ) {}

  async getUser(accessToken: string) {
    // https://dev.twitch.tv/docs/api/reference#get-users
    const token = this.httpService
      .get<TwitchTvGetUsersResponse>(`${twitchTvApiEndpoint}/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-ID': this.environment.twitchClientId,
        },
      })
      .pipe(map((response) => response.data.data[0]));

    return await firstValueFrom(token);
  }

  async getStreams(params: {
    userIds: string[];
    userLogins: string[];
    type?: 'all' | 'live';
  }): Promise<TwitchTvGetStreamsResponse['data']> {
    // https://dev.twitch.tv/docs/api/reference#get-streams
    this.logger.debug(`GET ${twitchTvApiEndpoint}/streams`);

    const queryParams: Record<string, unknown> = {};
    if (params.userLogins) {
      queryParams.user_login = params.userLogins;
    }

    if (params.type) {
      queryParams.type = params.type;
    }

    const token = await this.twitchAuthService.getAppAccessToken();

    // Twitch API allows up to 100 user_ids or user_logins per request
    const [userIdsChunks, userLoginsChunks] = [
      splitToChunks(params.userIds, 100),
      splitToChunks(params.userLogins, 100),
    ];

    const streams = zip(
      ...userIdsChunks.map((userIds) =>
        this.httpService
          .get<TwitchTvGetStreamsResponse>(`${twitchTvApiEndpoint}/streams`, {
            params: {
              ...queryParams,
              user_id: userIds,
            },
            headers: {
              'Client-ID': this.environment.twitchClientId,
              Authorization: `Bearer ${token}`,
            },
          })
          .pipe(map((response) => response.data.data)),
      ),
      ...userLoginsChunks.map((userLogins) =>
        this.httpService
          .get<TwitchTvGetStreamsResponse>(`${twitchTvApiEndpoint}/streams`, {
            params: {
              ...queryParams,
              user_login: userLogins,
            },
            headers: {
              'Client-ID': this.environment.twitchClientId,
              Authorization: `Bearer ${token}`,
            },
          })
          .pipe(map((response) => response.data.data)),
      ),
    ).pipe(map((streams) => streams.flat()));

    return await firstValueFrom(streams);
  }
}
