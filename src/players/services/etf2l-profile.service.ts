import { Injectable } from '@nestjs/common';
import { Etf2lProfile } from '../etf2l-profile';
import { switchMap, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';

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

  constructor(private httpService: HttpService) {}

  // TODO This is steamId or etf2lProfileId
  async fetchPlayerInfo(steamId: string): Promise<Etf2lProfile> {
    return this.httpService
      .get<Etf2lPlayerResponse>(`${this.etf2lEndpoint}/player/${steamId}.json`)
      .pipe(
        catchError((error) => {
          const response = error.response;
          switch (response.status) {
            case 404:
              return throwError(() => new NoEtf2lAccountError(steamId));

            default:
              return throwError(
                () => new Error(`${response.status}: ${response.statusText}`),
              );
          }
        }),
        switchMap((response) => {
          if (response.status === 200) {
            return of(response.data.player);
          } else {
            switch (response.status) {
              case 404:
                return throwError(() => new NoEtf2lAccountError(steamId));

              default:
                return throwError(
                  () => new Error(`${response.status}: ${response.statusText}`),
                );
            }
          }
        }),
      )
      .toPromise();
  }
}
