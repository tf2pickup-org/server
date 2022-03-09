import { Test, TestingModule } from '@nestjs/testing';
import { GameLauncherService } from './game-launcher.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Events } from '@/events/events';
import { GameServer } from '@/game-servers/models/game-server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Game, GameDocument, gameSchema } from '../models/game';
import { Model, Types, Error } from 'mongoose';
import { staticGameServerProviderName } from '@/game-servers/providers/static-game-server/static-game-server-provider-name';
import { NotImplementedError } from '@/game-servers/errors/not-implemented.error';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./games.service');
jest.mock('./server-configurator.service');

describe('GameLauncherService', () => {
  let service: GameLauncherService;
  let gamesService: jest.Mocked<GamesService>;
  let gameServersService: jest.Mocked<GameServersService>;
  let serverConfiguratorService: jest.Mocked<ServerConfiguratorService>;
  let mongod: MongoMemoryServer;
  let game: GameDocument;
  let gameModel: Model<GameDocument>;
  let mockGameServer: jest.Mocked<GameServer>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [
        GameLauncherService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        Events,
      ],
    }).compile();

    service = module.get<GameLauncherService>(GameLauncherService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
    gameModel = module.get(getModelToken(Game.name));

    mockGameServer = {
      id: 'FAKE_GAME_SERVER_ID',
      provider: staticGameServerProviderName,
      createdAt: new Date(),
      name: 'FAKE_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rcon: jest.fn().mockRejectedValue(new Error('not implemented')),
      voiceChannelName: jest
        .fn()
        .mockRejectedValue(new Error('not implemented')),
      getLogsecret: jest.fn().mockResolvedValue('FAKE_LOGSECRET'),
    };
  });

  beforeEach(async () => {
    gameServersService.assignGameServer.mockResolvedValue(mockGameServer);

    serverConfiguratorService.configureServer.mockResolvedValue({
      connectString: 'FAKE_CONNECT_STRING',
      stvConnectString: 'FAKE_STV_CONNECT_STRING',
    });

    // @ts-expect-error
    game = await gamesService._createOne();
    game.gameServer = new Types.ObjectId();
    await game.save();
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#launch()', () => {
    describe('when the game does not exist', () => {
      it('should throw', async () => {
        await expect(
          service.launch(new Types.ObjectId().toString()),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });

    it('should configure the game server', async () => {
      const ret = await service.launch(game.id);
      expect(serverConfiguratorService.configureServer).toHaveBeenCalledWith(
        game.id,
      );
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
      expect(ret.stvConnectString).toEqual('FAKE_STV_CONNECT_STRING');
    });

    it('should increment connectInfoVersion', async () => {
      const v = game.connectInfoVersion;
      const ret = await service.launch(game.id);
      expect(ret.connectInfoVersion).toEqual(v + 1);
    });
  });

  describe('#launchOrphanedGames()', () => {
    beforeEach(() => {
      gamesService.getOrphanedGames.mockResolvedValue([game]);
    });

    it('should launch orphaned games', async () => {
      const spy = jest.spyOn(service, 'launch');
      await service.launchOrphanedGames();
      expect(spy).toHaveBeenCalledWith(game.id);
    });
  });
});
