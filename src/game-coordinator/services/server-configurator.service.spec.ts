jest.mock('@/utils/wait-a-bit', () => ({
  waitABit: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import {
  logAddressAdd,
  kickAll,
  changelevel,
  execConfig,
  addGamePlayer,
  enablePlayerWhitelist,
  tvPort,
  tvPassword,
  tftrueWhitelistId,
  logsTfTitle,
} from '../utils/rcon-commands';
import { Tf2Team } from '../../games/models/tf2-team';
import { Game, GameDocument, gameSchema } from '../../games/models/game';
import { SlotStatus } from '../../games/models/slot-status';
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
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Events } from '@/events/events';
import { GameConfigsService } from '@/game-configs/services/game-configs.service';
import { MapPoolEntry } from '@/queue/models/map-pool-entry';
import { GamesService } from '@/games/services/games.service';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServerNotAssignedError } from '../errors/game-server-not-assigned.error';
import { GameEventType } from '@/games/models/game-event';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { CannotConfigureGameError } from '../errors/cannot-configure-game.error';
import { LogsTfUploadMethod } from '@/games/logs-tf-upload-method';

jest.mock('@/queue/services/map-pool.service');
jest.mock('@/players/services/players.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/games/services/games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('@/game-configs/services/game-configs.service');

class EnvironmentStub {
  logRelayAddress = 'FAKE_RELAY_ADDRESS';
  logRelayPort = '1234';
  websiteName = 'FAKE_WEBSITE_NAME';
}

class RconStub {
  authenticated = true;
  send = jest.fn().mockResolvedValue(null);
  end = jest.fn();
  connect = jest.fn();
}

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;
  let mongod: MongoMemoryServer;
  let playerModel: Model<PlayerDocument>;
  let gameModel: Model<GameDocument>;
  let playersService: jest.Mocked<PlayersService>;
  let mapPoolService: jest.Mocked<MapPoolService>;
  let configurationService: jest.Mocked<ConfigurationService>;
  let connection: Connection;
  let gamesService: GamesService;
  let gameServersService: jest.Mocked<GameServersService>;
  let gameConfigsService: jest.Mocked<GameConfigsService>;
  let mockGameServerControls: jest.Mocked<GameServerControls>;
  let mockPlayer1: PlayerDocument;
  let mockPlayer2: PlayerDocument;
  let mockGame: GameDocument;
  let configuration: Record<string, unknown>;

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
        MapPoolService,
        ConfigurationService,
        Events,
        GamesService,
        GameServersService,
        GameConfigsService,
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
    playerModel = module.get(getModelToken(Player.name));
    gameModel = module.get(getModelToken(Game.name));
    playersService = module.get(PlayersService);
    mapPoolService = module.get(MapPoolService);
    configurationService = module.get(ConfigurationService);
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    gameConfigsService = module.get(GameConfigsService);
  });

  beforeEach(async () => {
    mapPoolService.getMaps.mockResolvedValue([
      new MapPoolEntry('cp_badlands', 'etf2l_6v6_5cp'),
    ]);
    configuration = {
      'games.whitelist_id': undefined,
      'games.logs_tf_upload_method': LogsTfUploadMethod.Backend,
    };
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(configuration[key]),
    );
    gameConfigsService.compileConfig.mockReturnValue([
      'mp_tournament_readymode 1',
    ]);
    mockGameServerControls = {
      start: jest.fn(),
      rcon: jest.fn().mockResolvedValue(new RconStub()),
      getLogsecret: jest.fn().mockResolvedValue('FAKE_LOGSECRET'),
    };
    gameServersService.getControls.mockResolvedValue(mockGameServerControls);

    [mockPlayer1, mockPlayer2] = [
      // @ts-expect-error
      await playersService._createOne(),
      // @ts-expect-error
      await playersService._createOne(),
    ];

    mockGame = await gameModel.create({
      launchedAt: new Date(),
      number: 1,
      slots: [
        {
          player: mockPlayer1._id,
          team: Tf2Team.blu,
          gameClass: Tf2ClassName.soldier,
          status: SlotStatus.active,
        },
        {
          player: mockPlayer2._id,
          team: Tf2Team.red,
          gameClass: Tf2ClassName.soldier,
          status: SlotStatus.active,
        },
      ],
      map: 'cp_badlands',
      gameServer: {
        id: 'FAKE_GAME_SERVER',
        provider: 'test',
        name: 'FAKE GAME SERVER',
        address: 'FAKE_ADDRESS',
        port: 27015,
      },
    });
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await gameModel.deleteMany({});
  });

  afterEach(async () => await connection.close());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#configureServer()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();
      mockGameServerControls.rcon.mockResolvedValue(rcon as unknown as Rcon);
    });

    it('should wait for the gameserver to start', async () => {
      await service.configureServer(mockGame.id);
      expect(mockGameServerControls.start).toHaveBeenCalledTimes(1);
    });

    it('should execute correct rcon commands', async () => {
      await service.configureServer(mockGame.id);
      expect(rcon.send).toHaveBeenCalledWith(
        logAddressAdd('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(kickAll());
      expect(rcon.send).toHaveBeenCalledWith(changelevel('cp_badlands'));
      expect(rcon.send).toHaveBeenCalledWith('mp_tournament_readymode 1');
      expect(rcon.send).toHaveBeenCalledWith(execConfig('etf2l_6v6_5cp'));
      expect(rcon.send).toHaveBeenCalledWith(
        expect.stringMatching(/^sv_password\s.+$/),
      );
      expect(rcon.send).toHaveBeenCalledWith(
        addGamePlayer(
          mockPlayer1.steamId,
          mockPlayer1.name,
          Tf2Team.blu,
          Tf2ClassName.soldier,
        ),
      );
      expect(rcon.send).toHaveBeenCalledWith(
        addGamePlayer(
          mockPlayer2.steamId,
          mockPlayer2.name,
          Tf2Team.red,
          Tf2ClassName.soldier,
        ),
      );
      expect(rcon.send).toHaveBeenCalledWith(enablePlayerWhitelist());
      expect(rcon.send).toHaveBeenCalledWith(
        logsTfTitle('FAKE_WEBSITE_NAME #1'),
      );
      expect(rcon.send).toHaveBeenCalledWith('logstf_autoupload 0');
      expect(rcon.send).toHaveBeenCalledWith(tvPort());
      expect(rcon.send).toHaveBeenCalledWith(tvPassword());
    });

    describe('when the whitelistId is set', () => {
      beforeEach(() => {
        configuration['games.whitelist_id'] = 'FAKE_WHITELIST_ID';
      });

      it('should set the whitelist', async () => {
        await service.configureServer(mockGame.id);
        expect(rcon.send).toHaveBeenCalledWith(
          tftrueWhitelistId('FAKE_WHITELIST_ID'),
        );
      });
    });

    describe('when one of the players is replaced', () => {
      beforeEach(async () => {
        mockGame.slots = [
          {
            player: mockPlayer1._id,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.offline,
            events: [],
            getMostRecentEvent: jest.fn(),
          },
          {
            player: mockPlayer2._id,
            team: Tf2Team.red,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.replaced,
            connectionStatus: PlayerConnectionStatus.offline,
            events: [],
            getMostRecentEvent: jest.fn(),
          },
        ];
        await mockGame.save();
      });

      it('should not add this player to the game', async () => {
        await service.configureServer(mockGame._id);
        expect(rcon.send).toHaveBeenCalledWith(
          addGamePlayer(
            mockPlayer1.steamId,
            mockPlayer1.name,
            Tf2Team.blu,
            Tf2ClassName.soldier,
          ),
        );
        expect(rcon.send).not.toHaveBeenCalledWith(
          addGamePlayer(
            mockPlayer2.steamId,
            mockPlayer2.name,
            Tf2Team.red,
            Tf2ClassName.soldier,
          ),
        );
      });
    });

    it('should close the rcon connection', async () => {
      await service.configureServer(mockGame._id);
      expect(rcon.end).toHaveBeenCalled();
    });

    describe("when player's name contains non-english characters", () => {
      beforeEach(async () => {
        jest.useRealTimers();
        mockPlayer1.name = 'mąły';
        await mockPlayer1.save();
        jest.useFakeTimers();
      });

      it('should deburr player nicknames', async () => {
        await service.configureServer(mockGame._id);
        expect(rcon.send).toHaveBeenCalledWith(
          addGamePlayer(mockPlayer1.steamId, 'maly', Tf2Team.blu, 'soldier'),
        );
      });
    });

    describe('when an RCON command failed', () => {
      beforeEach(() => {
        rcon.send.mockRejectedValue(new Error('some random RCON error'));
      });

      it('should close the rcon connection even though an RCON command failed', async () => {
        await expect(service.configureServer(mockGame._id)).rejects.toThrow(
          CannotConfigureGameError,
        );
        expect(rcon.end).toHaveBeenCalled();
      });
    });

    describe('when a map change closes the rcon connection', () => {
      beforeEach(() => {
        rcon.send.mockImplementationOnce(() => (rcon.authenticated = false));
        rcon.connect.mockImplementation(() => (rcon.authenticated = true));
      });

      it('should reconnect', async () => {
        await service.configureServer(mockGame._id);
        expect(rcon.connect).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the game does not have a server assigned', () => {
      beforeEach(async () => {
        await mockGame.update({ $unset: { gameServer: 1 } });
      });

      it('should throw', async () => {
        await expect(service.configureServer(mockGame._id)).rejects.toThrow(
          GameServerNotAssignedError,
        );
      });
    });

    it('should update game', async () => {
      const { connectString, stvConnectString } = await service.configureServer(
        mockGame._id,
      );
      const game = await gamesService.getById(mockGame._id);
      expect(game.connectString).toEqual(connectString);
      expect(game.stvConnectString).toEqual(stvConnectString);
      expect(game.events.at(game.events.length - 1)?.event).toBe(
        GameEventType.GameServerInitialized,
      );
    });

    describe('when extra commands are to be executed', () => {
      beforeEach(() => {
        configuration['games.execute_extra_commands'] = [
          'sm_cvar spec_freeze_time 0',
        ];
      });

      it('should execute extra commands', async () => {
        await service.configureServer(mockGame._id);
        expect(rcon.send).toHaveBeenCalledWith('sm_cvar spec_freeze_time 0');
      });
    });

    describe('when logs.tf uploading is enabled', () => {
      beforeEach(() => {
        configuration['games.logs_tf_upload_method'] =
          LogsTfUploadMethod.Gameserver;
      });

      it('should enable logs.tf upload', async () => {
        await service.configureServer(mockGame._id);
        expect(rcon.send).toHaveBeenCalledWith('logstf_autoupload 2');
      });
    });
  });
});
