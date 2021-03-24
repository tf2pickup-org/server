import { Injectable } from '@nestjs/common';

@Injectable()
export class SteamApiService {

  async getTf2InGameHours(steamId64: string): Promise<number> {
    return Promise.resolve(1000);
  }

}
