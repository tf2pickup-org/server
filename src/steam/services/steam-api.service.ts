import { Environment } from '@/environment/environment';
import { steamApiEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { floor } from 'lodash';
import {
  catchError,
  firstValueFrom,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { SteamApiError } from '../errors/steam-api.error';

interface UserStatsForGameResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    stats: { name: string; value: number }[];
    achievements: { name: string; achieved: 1 }[];
  };
}

@Injectable()
export class SteamApiService {
  private readonly userStatsForGameEndpoint = `${steamApiEndpoint}/ISteamUserStats/GetUserStatsForGame/v0002`;
  private readonly tf2AppId = '440';

  constructor(
    private readonly httpService: HttpService,
    private readonly environment: Environment,
  ) {}

  async getTf2InGameHours(steamId64: string): Promise<number> {
    const hours = this.httpService
      .get<UserStatsForGameResponse>(`${this.userStatsForGameEndpoint}/`, {
        params: {
          appid: this.tf2AppId,
          key: this.environment.steamApiKey,
          steamid: steamId64,
          format: 'json',
        },
      })
      .pipe(
        switchMap((response) => {
          return of(
            response.data.playerstats.stats
              .filter((s) => /\.accum\.iPlayTime$/.test(s.name))
              .reduce((sum, curr) => sum + curr.value, 0),
          );
        }),
        map((seconds) => floor(seconds / 60 / 60)), // convert seconds to hours
        catchError((error) => throwError(() => new SteamApiError(error))),
      );

    return await firstValueFrom(hours);
  }
}
