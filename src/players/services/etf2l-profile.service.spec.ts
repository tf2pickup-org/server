import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lProfileService } from './etf2l-profile.service';
import { HttpService } from '@nestjs/axios';
import { Etf2lProfile } from '../etf2l-profile';
import { of, throwError } from 'rxjs';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';

const mockEtf2lProfile: Etf2lProfile = {
  id: 12345,
  name: 'FAKE_ETF2L_NAME',
  country: 'SOME_COUNTRY',
  classes: ['FAKE_CLASS_1', 'FAKE_CLASS_2'],
};

class HttpServiceStub {
  get = jest.fn().mockReturnValue(
    of({
      status: 200,
      data: { player: mockEtf2lProfile },
    }),
  );
}

describe('Etf2lProfileService', () => {
  let service: Etf2lProfileService;
  let httpService: HttpServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Etf2lProfileService,
        { provide: HttpService, useClass: HttpServiceStub },
      ],
    }).compile();

    service = module.get<Etf2lProfileService>(Etf2lProfileService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#fetchPlayerInfo()', () => {
    it('should query the ETF2L API', async () => {
      const res = await service.fetchPlayerInfo('FAKE_STEAM_ID');
      expect(httpService.get).toHaveBeenCalledWith(
        'http://api.etf2l.org/player/FAKE_STEAM_ID.json',
      );
      expect(res).toEqual(mockEtf2lProfile);
    });

    it('should handle 404', async () => {
      httpService.get.mockReturnValue(of({ status: 404 } as any));
      await expect(service.fetchPlayerInfo('')).rejects.toThrow(
        NoEtf2lAccountError,
      );
    });

    it('should handle 404 response error', async () => {
      httpService.get.mockImplementation(() =>
        throwError(() => ({
          response: {
            status: 404,
          },
        })),
      );
      await expect(service.fetchPlayerInfo('')).rejects.toThrow(
        NoEtf2lAccountError,
      );
    });

    it('should forward any other error', async () => {
      httpService.get.mockReturnValue(
        of({ status: 403, statusText: 'HAHAHA no.' } as any),
      );
      await expect(service.fetchPlayerInfo('')).rejects.toThrow(
        '403: HAHAHA no.',
      );
    });

    it('should forward any other response error', async () => {
      httpService.get.mockImplementation(() =>
        throwError(() => ({
          response: {
            status: 401,
            statusText: 'nope',
          },
        })),
      );
      await expect(service.fetchPlayerInfo('')).rejects.toThrow('401: nope');
    });
  });
});
