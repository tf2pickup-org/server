import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lApiService } from './etf2l-api.service';
import { Etf2lProfile } from '../types/etf2l-profile';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, AxiosRequestHeaders } from 'axios';
import { Etf2lApiError } from '../errors/etf2l-api.error';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';

jest.mock('@nestjs/axios');

describe('Etf2lApiService', () => {
  let service: Etf2lApiService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Etf2lApiService, HttpService],
    }).compile();

    service = module.get<Etf2lApiService>(Etf2lApiService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#fetchPlayerProfile()', () => {
    const mockEtf2lProfile: Etf2lProfile = {
      id: 12345,
      name: 'FAKE_ETF2L_NAME',
      country: 'SOME_COUNTRY',
      classes: ['FAKE_CLASS_1', 'FAKE_CLASS_2'],
      bans: null,
      registered: 0,
      steam: {
        avatar: '',
        id: '',
        id3: '',
        id64: '',
      },
      teams: [],
      title: 'Player',
      urls: {
        results: '',
        self: '',
        transfers: '',
      },
    };

    beforeEach(() => {
      httpService.get.mockReturnValue(
        of({
          status: 200,
          data: { player: mockEtf2lProfile },
        } as AxiosResponse),
      );
    });

    it('should query the etf2l.org endpoint', async () => {
      const profile = await service.fetchPlayerProfile('FAKE_STEAM_ID');
      expect(httpService.get).toHaveBeenCalledWith(
        'http://api-v2.etf2l.org/player/FAKE_STEAM_ID',
      );
      expect(profile).toEqual(mockEtf2lProfile);
    });

    describe('when the profile does not exist - response with code 404', () => {
      beforeEach(() => {
        httpService.get.mockReturnValue(
          of({
            status: 404,
          } as AxiosResponse),
        );
      });

      it('should throw NoEtf2lAccountError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(NoEtf2lAccountError);
      });
    });

    describe('when the profile does not exist - AxiosError', () => {
      beforeEach(() => {
        const headers = {} as AxiosRequestHeaders;
        httpService.get.mockReturnValue(
          throwError(
            () =>
              new AxiosError(
                'Request failed with status code 404',
                '404',
                undefined,
                undefined,
                {
                  status: 404,
                  statusText: 'NOT FOUND',
                  data: null,
                  config: { headers },
                  headers,
                },
              ),
          ),
        );
      });

      it('should throw NoEtf2lAccountError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(NoEtf2lAccountError);
      });
    });

    describe('when the API fails - response with code 500', () => {
      beforeEach(() => {
        httpService.get.mockReturnValue(
          of({
            status: 500,
          } as AxiosResponse),
        );
      });

      it('should throw Etf2lApiError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(Etf2lApiError);
      });
    });

    describe('when the API fails - AxiosError', () => {
      beforeEach(() => {
        const headers = {} as AxiosRequestHeaders;
        httpService.get.mockReturnValue(
          throwError(
            () =>
              new AxiosError(
                'Request failed with status code 500',
                '500',
                undefined,
                undefined,
                {
                  status: 500,
                  statusText: 'INTERNAL SERVER ERROR',
                  data: null,
                  config: { headers },
                  headers,
                },
              ),
          ),
        );
      });

      it('should throw Etf2lApiError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(Etf2lApiError);
      });
    });
  });
});
