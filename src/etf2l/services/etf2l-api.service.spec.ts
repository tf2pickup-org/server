import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lApiService } from './etf2l-api.service';
import { Etf2lProfile } from '../types/etf2l-profile';
import { Etf2lApiError } from '../errors/etf2l-api.error';
import { NoEtf2lAccountError } from '../errors/no-etf2l-account.error';

global.fetch = jest.fn();

describe('Etf2lApiService', () => {
  let service: Etf2lApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Etf2lApiService],
    }).compile();

    service = module.get<Etf2lApiService>(Etf2lApiService);
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
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ player: mockEtf2lProfile }),
      } as Response);
    });

    it('should query the etf2l.org endpoint', async () => {
      const profile = await service.fetchPlayerProfile('FAKE_STEAM_ID');
      expect(fetch).toHaveBeenCalledWith(
        'http://api-v2.etf2l.org/player/FAKE_STEAM_ID',
      );
      expect(profile).toEqual(mockEtf2lProfile);
    });

    describe('when the profile does not exist', () => {
      beforeEach(() => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);
      });

      it('should throw NoEtf2lAccountError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(NoEtf2lAccountError);
      });
    });

    describe('when the API fails', () => {
      beforeEach(() => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);
      });

      it('should throw Etf2lApiError', async () => {
        await expect(
          service.fetchPlayerProfile('FAKE_OTHER_STEAM_ID'),
        ).rejects.toThrow(Etf2lApiError);
      });
    });
  });
});
