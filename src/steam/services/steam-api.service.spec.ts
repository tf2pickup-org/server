import { Environment } from '@/environment/environment';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { of, throwError } from 'rxjs';
import { SteamApiError } from '../errors/steam-api.error';
import { SteamApiService } from './steam-api.service';

jest.mock('@nestjs/axios');
jest.mock('@/environment/environment');

describe('SteamApiService', () => {
  let service: SteamApiService;
  let httpService: jest.Mocked<HttpService>;
  let environment: jest.Mocked<Environment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteamApiService, HttpService, Environment],
    }).compile();

    service = module.get<SteamApiService>(SteamApiService);
    httpService = module.get(HttpService);
    environment = module.get(Environment);
  });

  beforeEach(() => {
    Object.defineProperty(environment, 'steamApiKey', {
      get: jest.fn(() => 'FAKE_STEAM_API_KEY'),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getTf2InGameHours()', () => {
    describe('with response 200', () => {
      beforeEach(async () => {
        const steamApiResponseJson = await readFile(
          resolve(__dirname, '..', 'steam-api-response.json'),
        );
        httpService.get.mockReturnValue(
          of({
            status: 200,
            data: JSON.parse(steamApiResponseJson.toString()),
          } as AxiosResponse),
        );
      });

      it('should calculate in-game hours', async () => {
        const hours = await service.getTf2InGameHours('FAKE_STEAM_ID');
        expect(hours).toBe(7143);
        expect(httpService.get).toHaveBeenCalledWith(
          'https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/',
          {
            params: {
              appid: '440',
              key: 'FAKE_STEAM_API_KEY',
              steamid: 'FAKE_STEAM_ID',
              format: 'json',
            },
          },
        );
      });
    });

    describe('with response code 500', () => {
      beforeEach(() => {
        const error = new AxiosError('Forbidden', '403');
        error.response = {
          data: {},
          status: 403,
          statusText: 'Forbidden',
        } as AxiosResponse;
        httpService.get.mockReturnValue(throwError(() => error));
      });

      it('should throw an error', async () => {
        await expect(
          service.getTf2InGameHours('FAKE_STEAM_ID'),
        ).rejects.toThrow(SteamApiError);
      });
    });
  });
});
