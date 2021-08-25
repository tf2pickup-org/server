import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Player, playerSchema } from '../models/player';
import { OnlinePlayersService } from '../services/online-players.service';
import { PlayersService } from '../services/players.service';
import { OnlinePlayersController } from './online-players.controller';

jest.mock('../services/players.service');
jest.mock('../services/online-players.service');
jest.mock('@/player-preferences/services/player-preferences.service');

describe('OnlinePlayersController', () => {
  let controller: OnlinePlayersController;
  let mongod: MongoMemoryServer;
  let playersService: jest.Mocked<PlayersService>;
  let playerPreferencesService: jest.Mocked<PlayerPreferencesService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [
        OnlinePlayersService,
        PlayersService,
        PlayerPreferencesService,
      ],
      controllers: [OnlinePlayersController],
    }).compile();

    controller = module.get<OnlinePlayersController>(OnlinePlayersController);
    playersService = module.get(PlayersService);
    playerPreferencesService = module.get(PlayerPreferencesService);

    playerPreferencesService.getPlayerPreferences.mockResolvedValue(new Map());
  });

  // @ts-expect-error
  afterEach(async () => playersService._reset());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getOnlinePlayers()', () => {
    let players: string[];

    beforeEach(async () => {
      players = [];

      // @ts-expect-error
      players.push((await playersService._createOne()).id);
      // @ts-expect-error
      players.push((await playersService._createOne()).id);

      const mockOnlinePlayersService = OnlinePlayersService as jest.Mocked<
        typeof OnlinePlayersService
      >;
      Object.defineProperty(
        mockOnlinePlayersService.prototype,
        'onlinePlayers',
        {
          get: jest.fn(() => players),
          configurable: true,
        },
      );
    });

    it('should resolve online players', async () => {
      const ret = await controller.getOnlinePlayers();
      expect(ret.length).toEqual(2);
    });

    it("should respect user's show online status preference", async () => {
      playerPreferencesService.getPlayerPreferences.mockResolvedValue(
        new Map([['showOnlineStatus', 'false']]),
      );
      const ret = await controller.getOnlinePlayers();
      expect(ret.length).toBe(0);
    });
  });
});
