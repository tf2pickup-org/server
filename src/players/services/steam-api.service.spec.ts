import { Test, TestingModule } from '@nestjs/testing';
import { SteamApiService } from './steam-api.service';
import { of, throwError } from 'rxjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { HttpService } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { Tf2InGameHoursVerificationError } from '../errors/tf2-in-game-hours-verification.error';

const steamApiResponseJson = readFileSync(resolve(__dirname, '..', 'steam-api-response.json'));

class HttpServiceStub {
  get(url: string) {
    return of({
      status: 200,
      data: JSON.parse(steamApiResponseJson.toString()),
    });
  }
}

const environment = {
  steamApiKey: 'FAKE_STEAM_API_KEY',
};

describe('SteamApiService', () => {
  let service: SteamApiService;
  let httpService: HttpServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamApiService,
        { provide: HttpService, useClass: HttpServiceStub },
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<SteamApiService>(SteamApiService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getTf2InGameHours()', () => {
    it('should query the correct URL', async () => {
      const spy = jest.spyOn(httpService, 'get');
      await service.getTf2InGameHours('FAKE_STEAM_ID');
      expect(spy).toHaveBeenCalledWith('http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=440&key=FAKE_STEAM_API_KEY&steamid=FAKE_STEAM_ID&format=json');
    });

    describe('with response 200', () => {
      it('should calculate in-game hours', async () => {
        const res = await service.getTf2InGameHours('FAKE_STEAM_ID');
        expect(res).toBe(7143);
      });
    });

    describe('with response code 500', () => {
      beforeEach(() => {
        jest.spyOn(httpService, 'get').mockReturnValue(throwError({ status: 500 } as any));
      });

      it('should throw an error', async () => {
        await expect(service.getTf2InGameHours('FAKE_STEAM_ID')).rejects.toThrow(Tf2InGameHoursVerificationError);
      });
    });
  });
});
