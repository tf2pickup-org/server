import { etf2lApiEndpoint } from '@configs/urls';
import { Injectable } from '@nestjs/common';
import { Etf2lApiError } from '../errors/etf2l-api.error';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';
import { Etf2lProfile } from '../types/etf2l-profile';

interface Etf2lPlayerResponse {
  player: Etf2lProfile;
  status: {
    code: number;
    message: string;
  };
}

@Injectable()
export class Etf2lApiService {
  async fetchPlayerProfile(steamIdOrEtf2lId: string): Promise<Etf2lProfile> {
    const url = `${etf2lApiEndpoint}/player/${steamIdOrEtf2lId}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = (await response.json()) as Etf2lPlayerResponse;
      return data.player;
    }

    if (response.status === 404) {
      throw new NoEtf2lAccountError(steamIdOrEtf2lId);
    }

    throw new Etf2lApiError(url, `${response.status} ${response.statusText}`);
  }
}
