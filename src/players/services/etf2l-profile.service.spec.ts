import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lProfileService } from './etf2l-profile.service';
import { HttpService } from '@nestjs/common';
import { Etf2lProfile } from '../models/etf2l-profile';
import { of } from 'rxjs';

class HttpServiceStub {
  get(url: string) { return null; }
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
    const etf2lProfile: Etf2lProfile = {
      id: 12345,
      name: 'FAKE_ETF2L_NAME',
      country: 'SOME_COUNTRY',
      classes: [ 'FAKE_CLASS_1', 'FAKE_CLASS_2' ],
    };

    const response = {
      status: 200,
      data: { player: etf2lProfile },
    };

    it('should query the ETF2L API', async () => {
      const spy = spyOn(httpService, 'get').and.returnValue(of(response));
      const res = await service.fetchPlayerInfo('FAKE_STEAM_ID');
      expect(spy).toHaveBeenCalledWith('http://api.etf2l.org/player/FAKE_STEAM_ID');
      expect(res).toEqual(etf2lProfile);
    });

    it('should handle 404', async () => {
      spyOn(httpService, 'get').and.returnValue(of({ status: 404 }));
      await expectAsync(service.fetchPlayerInfo('')).toBeRejectedWithError('no ETF2L profile');
    });

    it('should forward any other error', async () => {
      spyOn(httpService, 'get').and.returnValue(of({ status: 403, statusText: 'HAHAHA no.' }));
      await expectAsync(service.fetchPlayerInfo('')).toBeRejectedWithError('403: HAHAHA no.');
    });
  });
});
