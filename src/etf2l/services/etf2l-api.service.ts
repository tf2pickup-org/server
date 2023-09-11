import { etf2lApiEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom, of, switchMap, throwError } from 'rxjs';
import { Etf2lApiError } from '../errors/etf2l-api.error';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';
import { Etf2lProfile } from '../types/etf2l-profile';
import { AxiosError } from 'axios';

interface Etf2lPlayerResponse {
  player: Etf2lProfile;
  status: {
    code: number;
    message: string;
  };
}

@Injectable()
export class Etf2lApiService {
  constructor(private readonly httpService: HttpService) {}

  async fetchPlayerProfile(steamIdOrEtf2lId: string): Promise<Etf2lProfile> {
    const url = `${etf2lApiEndpoint}/player/${steamIdOrEtf2lId}`;
    return await firstValueFrom(
      this.httpService.get<Etf2lPlayerResponse>(url).pipe(
        catchError((err: AxiosError) => {
          if (err.response?.status === 404) {
            throw new NoEtf2lAccountError(steamIdOrEtf2lId);
          }
          throw new Etf2lApiError(url, `${err.code} ${err.message}`);
        }),
        switchMap((response) => {
          switch (response.status) {
            case 200:
              return of(response.data.player);

            case 404:
              return throwError(
                () => new NoEtf2lAccountError(steamIdOrEtf2lId),
              );

            default:
              return throwError(
                () =>
                  new Etf2lApiError(
                    url,
                    `${response.status} ${response.statusText}`,
                  ),
              );
          }
        }),
      ),
    );
  }
}
