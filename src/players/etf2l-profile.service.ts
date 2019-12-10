import { Injectable, HttpService } from '@nestjs/common';
import { Etf2lProfile } from './models/etf2l-profile';
import { switchMap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

interface Etf2lPlayerResponse {
  player: Etf2lProfile;
  status: {
    code: number;
    message: string;
  };
}

@Injectable()
export class Etf2lProfileService {

  private readonly etf2lEndpoint = 'http://api.etf2l.org';

  constructor(
    private httpService: HttpService,
  ) { }

  async fetchPlayerInfo(steamId: string): Promise<Etf2lProfile> {
    return this.httpService.get<Etf2lPlayerResponse>(`${this.etf2lEndpoint}/player/${steamId}`).pipe(
      switchMap(response => {
        if (response.status === 200) {
          return of(response.data.player);
        } else {
          switch (response.status) {
            case 404:
              return throwError(new Error('no ETF2L profile'));

            default:
              return throwError(new Error(`${response.status}: ${response.statusText}`));
          }
        }
      }),
    ).toPromise();
  }

}
