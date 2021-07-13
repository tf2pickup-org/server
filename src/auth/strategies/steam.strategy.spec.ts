import { Environment } from '@/environment/environment';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { Test, TestingModule } from '@nestjs/testing';
import { SteamStrategy } from './steam.strategy';
import { Error } from 'mongoose';

const mockPlayer: Player = {
  id: 'FAKE_PLAYER_ID',
  name: 'FAKE_PLAYER',
  steamId: 'FAKE_STEAM_ID',
  hasAcceptedRules: true,
  _links: [],
};

jest.mock('@/players/services/players.service', () => ({
  PlayersService: jest.fn().mockImplementation(() => ({
    findBySteamId: jest.fn().mockResolvedValue(mockPlayer),
    createPlayer: jest
      .fn()
      .mockResolvedValue({ ...mockPlayer, hasAcceptedRules: false }),
    updatePlayer: jest.fn().mockResolvedValue(mockPlayer),
  })),
}));

const environment = {
  apiUrl: 'http://api.tf2pickup.pl',
  steamApiKey: 'FAKE_STEAM_API_KEY',
};

describe('SteamStrategy', () => {
  let strategy: SteamStrategy;
  let playersService: jest.Mocked<PlayersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamStrategy,
        PlayersService,
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    strategy = module.get<SteamStrategy>(SteamStrategy);
    playersService = module.get(PlayersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('#validate()', () => {
    describe('when the player does have an account', () => {
      it("should return that player's profile", async () => {
        const player = await strategy.validate('FAKE_STEAM_ID', {
          provider: 'steam',
          id: 'FAKE_STEAM_ID',
          displayName: 'FAKE_PLAYER',
          photos: [],
        });
        expect(playersService.createPlayer).not.toHaveBeenCalled();
        expect(player).toEqual(mockPlayer);
      });
    });

    describe('when the player does not have an account', () => {
      beforeEach(() => {
        playersService.findBySteamId.mockImplementation((steamId) => {
          throw new Error.DocumentNotFoundError(steamId);
        });
      });

      it('should create it', async () => {
        const player = await strategy.validate('FAKE_STEAM_ID', {
          provider: 'steam',
          id: 'FAKE_STEAM_ID',
          displayName: 'FAKE_PLAYER',
          photos: [],
        });
        expect(playersService.createPlayer).toHaveBeenCalled();
        expect(player.steamId).toEqual('FAKE_STEAM_ID');
        expect(player.hasAcceptedRules).toBe(false);
      });
    });
  });
});
