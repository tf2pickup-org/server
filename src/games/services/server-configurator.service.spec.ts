import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import { RconFactoryService } from './rcon-factory.service';
import {
  logAddressAdd,
  kickAll,
  changelevel,
  execConfig,
  addGamePlayer,
  enablePlayerWhitelist,
  tvPort,
  tvPassword,
  logAddressDel,
  delAllGamePlayers,
  disablePlayerWhitelist,
  tftrueWhitelistId,
} from '../utils/rcon-commands';
import { Tf2Team } from '../models/tf2-team';
import { Game, GameDocument, gameSchema } from '../models/game';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MapPoolService } from '@/queue/services/map-pool.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { Rcon } from 'rcon-client/lib';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { WhitelistId } from '@/configuration/models/whitelist-id';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Events } from '@/events/events';
import { GameServer } from '@/game-servers/models/game-server';

jest.mock('@/queue/services/map-pool.service');
jest.mock('@/players/services/players.service');
jest.mock('./rcon-factory.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');

class EnvironmentStub {
  logRelayAddress = 'FAKE_RELAY_ADDRESS';
  logRelayPort = '1234';
}

class RconStub {
  send = jest.fn().mockResolvedValue(null);
  end = jest.fn();
}

const mockGameServer: GameServer = {
  id: 'MOCK_GAME_SERVER',
  name: 'FAKE_SERVER',
  address: '123.45.67.89',
  internalIpAddress: '127.0.0.1',
  port: '27015',
  rconPassword: 'FAKE_RCON_PASSWORD',
  createdAt: new Date(),
  isAvailable: true,
  isOnline: true,
  priority: 1,
};

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;
  let mongod: MongoMemoryServer;
  let playerModel: Model<PlayerDocument>;
  let gameModel: Model<GameDocument>;
  let rconFactoryService: jest.Mocked<RconFactoryService>;
  let playersService: jest.Mocked<PlayersService>;
  let mapPoolService: jest.Mocked<MapPoolService>;
  let configurationService: jest.Mocked<ConfigurationService>;
  let connection: Connection;
  let gamesService: GamesService;
  let gameServersService: jest.Mocked<GameServersService>;

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
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [
        ServerConfiguratorService,
        { provide: Environment, useClass: EnvironmentStub },
        PlayersService,
        RconFactoryService,
        MapPoolService,
        ConfigurationService,
        Events,
        GamesService,
        GameServersService,
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
    playerModel = module.get(getModelToken(Player.name));
    gameModel = module.get(getModelToken(Game.name));
    rconFactoryService = module.get(RconFactoryService);
    playersService = module.get(PlayersService);
    mapPoolService = module.get(MapPoolService);
    configurationService = module.get(ConfigurationService);
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
  });

  beforeEach(() => {
    mapPoolService.getMaps.mockResolvedValue([
      { name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' },
    ]);
    configurationService.getWhitelistId.mockResolvedValue(new WhitelistId(''));
    gameServersService.getById.mockResolvedValue(mockGameServer);
  });

  afterEach(async () => await connection.close());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#configureServer()', () => {
    const stableTestCoefficient = 7;
    let player1: PlayerDocument;
    let player2: PlayerDocument;
    let rcon: RconStub;
    let game: GameDocument;

    beforeEach(async () => {
      [player1, player2] = [
        // @ts-expect-error
        await playersService._createOne(),
        // @ts-expect-error
        await playersService._createOne(),
      ];

      game = await gameModel.create({
        launchedAt: new Date(),
        number: 1,
        slots: [
          {
            player: player1._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
          },
          {
            player: player2._id,
            team: Tf2Team.red,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
          },
        ],
        map: 'cp_badlands',
      });

      rcon = new RconStub();
      rconFactoryService.createRcon.mockResolvedValue(rcon as unknown as Rcon);
      jest.useFakeTimers('legacy');
    });

    afterEach(async () => {
      jest.useRealTimers();
      // @ts-expect-error
      await playersService._reset();
      await gameModel.deleteMany({});
    });

    it('should execute correct rcon commands', async () => {
      const ret = new Promise<void>((resolve) => {
        service.configureServer(game.id).then(() => {
          expect(rcon.send).toHaveBeenCalledWith(
            logAddressAdd('FAKE_RELAY_ADDRESS:1234'),
          );
          expect(rcon.send).toHaveBeenCalledWith(kickAll());
          expect(rcon.send).toHaveBeenCalledWith(changelevel('cp_badlands'));
          expect(rcon.send).toHaveBeenCalledWith(execConfig('etf2l_6v6_5cp'));
          expect(rcon.send).toHaveBeenCalledWith(
            expect.stringMatching(/^sv_password\s.+$/),
          );
          expect(rcon.send).toHaveBeenCalledWith(
            addGamePlayer(
              player1.steamId,
              player1.name,
              Tf2Team.blu,
              Tf2ClassName.soldier,
            ),
          );
          expect(rcon.send).toHaveBeenCalledWith(
            addGamePlayer(
              player2.steamId,
              player2.name,
              Tf2Team.red,
              Tf2ClassName.soldier,
            ),
          );
          expect(rcon.send).toHaveBeenCalledWith(enablePlayerWhitelist());
          expect(rcon.send).toHaveBeenCalledWith(tvPort());
          expect(rcon.send).toHaveBeenCalledWith(tvPassword());

          resolve();
        });
      });

      for (let i = 0; i < stableTestCoefficient; i++) {
        jest.runAllTimers();
        await flushPromises();
      }

      return ret;
    });

    describe('when the whitelistId is set', () => {
      beforeEach(() => {
        configurationService.getWhitelistId.mockResolvedValue(
          new WhitelistId('FAKE_WHITELIST_ID'),
        );
      });

      it('should set the whitelist', async () => {
        const ret = service.configureServer(game.id).then(() => {
          expect(rcon.send).toHaveBeenCalledWith(
            tftrueWhitelistId('FAKE_WHITELIST_ID'),
          );
        });

        for (let i = 0; i < 5; i++) {
          jest.runAllTimers();
          await flushPromises();
        }

        return ret;
      });
    });

    describe('when one of the players is replaced', () => {
      beforeEach(async () => {
        game.slots = [
          {
            player: player1._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
          },
          {
            player: player2._id,
            team: Tf2Team.red,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.replaced,
          },
        ];
        await game.save();
      });

      it('should not add this player to the game', async () => {
        const ret = service.configureServer(game.id).then(() => {
          expect(rcon.send).toHaveBeenCalledWith(
            addGamePlayer(
              player1.steamId,
              player1.name,
              Tf2Team.blu,
              Tf2ClassName.soldier,
            ),
          );
          expect(rcon.send).not.toHaveBeenCalledWith(
            addGamePlayer(
              player2.steamId,
              player2.name,
              Tf2Team.red,
              Tf2ClassName.soldier,
            ),
          );
        });

        for (let i = 0; i < stableTestCoefficient; i++) {
          jest.runAllTimers();
          await flushPromises();
        }

        return ret;
      });
    });

    it('should close the rcon connection', async () => {
      const ret = service.configureServer(game.id).then(() => {
        expect(rcon.end).toHaveBeenCalled();
      });
      for (let i = 0; i < stableTestCoefficient; i++) {
        jest.runAllTimers();
        await flushPromises();
      }
      return ret;
    });

    describe("when player's name contains non-english characters", () => {
      beforeEach(async () => {
        jest.useRealTimers();
        player1.name = 'mąły';
        await player1.save();
        jest.useFakeTimers('legacy');
      });

      it('should deburr player nicknames', async () => {
        const ret = service.configureServer(game.id).then(() => {
          expect(rcon.send).toHaveBeenCalledWith(
            addGamePlayer(player1.steamId, 'maly', Tf2Team.blu, 'soldier'),
          );
        });

        for (let i = 0; i < stableTestCoefficient; i++) {
          jest.runAllTimers();
          await flushPromises();
        }

        return ret;
      });
    });

    describe('when an RCON command failed', () => {
      beforeEach(() => {
        rcon.send.mockRejectedValue('some random RCON error');
      });

      it('should close the rcon connection even though an RCON command failed', async () => {
        await expect(service.configureServer(game.id)).rejects.toThrowError();
        expect(rcon.end).toHaveBeenCalled();
      });
    });
  });

  describe('#cleanupServer()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();
      rconFactoryService.createRcon.mockResolvedValue(rcon as any);
    });

    it('should execute correct rcon commands', async () => {
      await service.cleanupServer(mockGameServer.id);

      expect(rcon.send).toHaveBeenCalledWith(
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(delAllGamePlayers());
      expect(rcon.send).toHaveBeenCalledWith(disablePlayerWhitelist());
    });

    it('should close the rcon connection', async () => {
      await service.cleanupServer(mockGameServer.id);
      expect(rcon.end).toHaveBeenCalled();
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      rcon.send.mockRejectedValue('some random RCON error');

      await expect(
        service.cleanupServer(mockGameServer.id),
      ).rejects.toThrowError();
      expect(rcon.end).toHaveBeenCalled();
    });
  });
});
