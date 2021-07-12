import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
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
import { QueueConfig } from '@/queue/queue-config';
import { Tf2Team } from '../models/tf2-team';
import { Game } from '../models/game';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MapPoolService } from '@/queue/services/map-pool.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { Rcon } from 'rcon-client/lib';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';

jest.mock('@/queue/services/map-pool.service');
jest.mock('@/players/services/players.service');
jest.mock('./rcon-factory.service');
jest.mock('@/configuration/services/configuration.service');

class EnvironmentStub {
  logRelayAddress = 'FAKE_RELAY_ADDRESS';
  logRelayPort = '1234';
}

class QueueConfigServiceStub {
  queueConfig = {
    maps: [{ name: 'cp_badlands', configName: '5cp' }],
    configs: {
      '5cp': 'etf2l_6v6_5cp',
    },
  } as Partial<QueueConfig>;
}

class RconStub {
  send = jest.fn().mockResolvedValue(null);
  end = jest.fn();
}

const gameServer = {
  name: 'FAKE_SERVER',
};

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;
  let mongod: MongoMemoryServer;
  let playerModel: Model<PlayerDocument>;
  let rconFactoryService: jest.Mocked<RconFactoryService>;
  let playersService: jest.Mocked<PlayersService>;
  let queueConfigService: QueueConfigServiceStub;
  let mapPoolService: jest.Mocked<MapPoolService>;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [
        ServerConfiguratorService,
        { provide: Environment, useClass: EnvironmentStub },
        PlayersService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        RconFactoryService,
        MapPoolService,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
    playerModel = module.get(getModelToken(Player.name));
    rconFactoryService = module.get(RconFactoryService);
    playersService = module.get(PlayersService);
    queueConfigService = module.get(QueueConfigService);
    mapPoolService = module.get(MapPoolService);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(() => {
    mapPoolService.getMaps.mockResolvedValue([
      { name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' },
    ]);
    configurationService.getWhitelistId.mockResolvedValue('');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#configureServer()', () => {
    let player1: PlayerDocument;
    let player2: PlayerDocument;
    let rcon: RconStub;
    let game: Game;

    beforeEach(async () => {
      [player1, player2] = [
        // @ts-expect-error
        await playersService._createOne(),
        // @ts-expect-error
        await playersService._createOne(),
      ];

      game = new Game();
      game.launchedAt = new Date();
      game.number = 1;
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
          status: SlotStatus.active,
        },
      ];
      game.map = 'cp_badlands';

      rcon = new RconStub();
      rconFactoryService.createRcon.mockResolvedValue(rcon as unknown as Rcon);
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
        cb();
        return null;
      });
    });

    afterEach(async () => {
      jest.useRealTimers();
      // @ts-expect-error
      await playersService._reset();
    });

    it('should execute correct rcon commands', async () => {
      await service.configureServer(gameServer as any, game);

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
    });

    describe('when the whitelistId is set', () => {
      beforeEach(() => {
        configurationService.getWhitelistId.mockResolvedValue(
          'FAKE_WHITELIST_ID',
        );
      });

      it('should set the whitelist', async () => {
        await service.configureServer(gameServer as any, game);
        expect(rcon.send).toHaveBeenCalledWith(
          tftrueWhitelistId('FAKE_WHITELIST_ID'),
        );
      });
    });

    describe('when one of the players is replaced', () => {
      beforeEach(() => {
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
      });

      it('should not add this player to the game', async () => {
        await service.configureServer(gameServer as any, game);

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
    });

    it('should close the rcon connection', async () => {
      await service.configureServer(gameServer as any, game as any);
      expect(rcon.end).toHaveBeenCalled();
    });

    describe("when player's name contains non-english characters", () => {
      beforeEach(async () => {
        jest.useRealTimers();
        player1.name = 'mąły';
        await player1.save();
        jest.useFakeTimers();
        jest
          .spyOn(global, 'setTimeout')
          .mockImplementation((cb: () => void) => {
            cb();
            return null;
          });
      });

      it('should deburr player nicknames', async () => {
        await service.configureServer(gameServer as any, game as any);
        expect(rcon.send).toHaveBeenCalledWith(
          addGamePlayer(player1.steamId, 'maly', Tf2Team.blu, 'soldier'),
        );
      });
    });

    describe('when an RCON command failed', () => {
      beforeEach(() => {
        rcon.send.mockRejectedValue('some random RCON error');
      });

      it('should close the rcon connection even though an RCON command failed', async () => {
        await expect(
          service.configureServer(gameServer as any, game as any),
        ).rejects.toThrowError();
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
      await service.cleanupServer(gameServer as any);

      expect(rcon.send).toHaveBeenCalledWith(
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(delAllGamePlayers());
      expect(rcon.send).toHaveBeenCalledWith(disablePlayerWhitelist());
    });

    it('should close the rcon connection', async () => {
      await service.cleanupServer(gameServer as any);
      expect(rcon.end).toHaveBeenCalled();
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      rcon.send.mockRejectedValue('some random RCON error');

      await expect(
        service.cleanupServer(gameServer as any),
      ).rejects.toThrowError();
      expect(rcon.end).toHaveBeenCalled();
    });
  });
});
