import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lProfileService } from './etf2l-profile.service';
import { HttpService } from '@nestjs/axios';
import { Etf2lProfile } from '../etf2l-profile';
import { of } from 'rxjs';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';

const mockEtf2lProfile: Etf2lProfile = {
  id: 12345,
  name: 'FAKE_ETF2L_NAME',
  country: 'SOME_COUNTRY',
  classes: ['FAKE_CLASS_1', 'FAKE_CLASS_2'],
};

class HttpServiceStub {
  get(url: string) {
    return of({
      status: 200,
      data: { player: mockEtf2lProfile },
    });
  }
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

  describe('#ffetchPlayerInfo()', () => {
    it('should query the ETF2L API', async () => {
      const spy = jest.spyOn(httpService, 'get');
      const res = await service.fetchPlayerInfo('FAKE_STEAM_ID');
      expect(spy).toHaveBeenCalledWith(
        'http://api.etf2l.org/player/FAKE_STEAM_ID.json',
      );
      expect(res).toEqual(mockEtf2lProfile);
    });

    it('should handle 404', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ status: 404 } as any));
      await expect(service.fetchPlayerInfo('')).rejects.toThrow(
        NoEtf2lAccountError,
      );
    });

    it('should forward any other error', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ status: 403, statusText: 'HAHAHA no.' } as any));
      await expect(service.fetchPlayerInfo('')).rejects.toThrowError(
        '403: HAHAHA no.',
      );
    });
  });
});
