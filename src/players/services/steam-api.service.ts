import { Injectable, HttpService } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { map, switchMap } from 'rxjs/operators';
import { floor } from 'lodash';
import { of, throwError } from 'rxjs';

interface UserStatsForGameResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    stats: { name: string; value: number }[];
    achievements: { name: string; achieved: 1 }[];
  }
}

@Injectable()
export class SteamApiService {

  private readonly steamApiEndpoint = 'http://api.steampowered.com';
  private readonly userStatsEndpoint = `${this.steamApiEndpoint}/ISteamUserStats`;
  private readonly userStatsForGameEndpoint = `${this.userStatsEndpoint}/GetUserStatsForGame/v0002`;
  private readonly tf2AppId = '440';

  constructor(
    private httpService: HttpService,
    private environment: Environment,
  ) { }

  async getTf2InGameHours(steamId64: string): Promise<number> {
    return this.httpService.get<UserStatsForGameResponse>(`${this.userStatsForGameEndpoint}/?appid=${this.tf2AppId}&key=${this.environment.steamApiKey}&steamid=${steamId64}&format=json`).pipe(
      switchMap(response => {
        if (response.status === 200) {
          return of(
            response.data.playerstats.stats
              .filter(s => /\.accum\.iPlayTime$/.test(s.name))
              .reduce((sum, curr) => sum + curr.value, 0)
          );
        } else {
          return throwError(new Error('cannot verify in-game hours for TF2'));
        }
      }),
      map(seconds => floor(seconds / 60 / 60)),
    ).toPromise();
  }

}
