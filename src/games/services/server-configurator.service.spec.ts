import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { RconFactoryService } from './rcon-factory.service';
import { logAddressAdd, kickAll, changelevel, execConfig, addGamePlayer, enablePlayerWhitelist, tvPort, tvPassword,
  logAddressDel, delAllGamePlayers, disablePlayerWhitelist, tftrueWhitelistId } from '../utils/rcon-commands';
import { QueueConfig } from '@/queue/queue-config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Player } from '@/players/models/player';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { TypegooseModule } from 'nestjs-typegoose';
import { DocumentType } from '@typegoose/typegoose';
import { Game } from '../models/game';

jest.mock('./rcon-factory.service');
jest.mock('@/players/services/players.service');

class EnvironmentStub {
  logRelayAddress = 'FAKE_RELAY_ADDRESS';
  logRelayPort = '1234';
}

class QueueConfigServiceStub {
  queueConfig = {
    maps: [
      { name: 'cp_badlands', configName: '5cp' },
    ],
    configs: {
      '5cp': 'etf2l_6v6_5cp',
    },
  } as Partial<QueueConfig>;
}

class RconStub {
  commands = [];
  send(cmd: string) { this.commands.push(cmd); }
  end() { return null; }
}

const gameServer = {
  name: 'FAKE_SERVER',
};

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;
  let mongod: MongoMemoryServer;
  let rconFactoryService: RconFactoryService;
  let playersService: PlayersService;
  let queueConfigService: QueueConfigServiceStub;
  let rcon: RconStub;
  let player1: DocumentType<Player>;
  let player2: DocumentType<Player>;
  let game: Game;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Player]),
      ],
      providers: [
        ServerConfiguratorService,
        { provide: Environment, useClass: EnvironmentStub },
        PlayersService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        RconFactoryService,
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
    rconFactoryService = module.get(RconFactoryService);
    playersService = module.get(PlayersService);
    queueConfigService = module.get(QueueConfigService);
  });

  beforeEach(async () => {
    rcon = new RconStub();

    // @ts-expect-error
    rconFactoryService.createRcon = () => Promise.resolve(rcon);
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();

    game = {
      map: 'cp_badlands',
      number: 1,
      state: 'launching',
      slots: [
        {
          player: player1._id,
          team: 'blu',
          gameClass: 'soldier',
        },
        {
          player: player2._id,
          team: 'red',
          gameClass: 'soldier',
        },
      ],
    };
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#configureServer()', () => {
    it('should execute correct rcon commands', async () => {
      await service.configureServer(gameServer as any, game);
      expect(rcon.commands).toEqual([
        logAddressAdd('FAKE_RELAY_ADDRESS:1234'),
        kickAll(),
        changelevel('cp_badlands'),
        execConfig('etf2l_6v6_5cp'),
        expect.stringMatching(/^sv_password\s.+$/),
        addGamePlayer(player1.steamId, player1.name, 'blu', 'soldier'),
        addGamePlayer(player2.steamId, player2.name, 'red', 'soldier'),
        enablePlayerWhitelist(),
        tvPort(),
        tvPassword(),
      ]);
    });

    describe('when the whitelistId is set', () => {
      beforeEach(() => {
        queueConfigService.queueConfig.whitelistId = 'FAKE_WHITELIST_ID';
      });

      it('should set the whitelist', async () => {
        await service.configureServer(gameServer as any, game);
        expect(rcon.commands).toEqual(expect.arrayContaining([ tftrueWhitelistId('FAKE_WHITELIST_ID') ]));
      });
    });

    describe('when the execConfigs is set', () => {
      beforeEach(() => {
        queueConfigService.queueConfig.execConfigs = [ 'test' ];
      });

      it('should execute the configs', async () => {
        await service.configureServer(gameServer as any, game);
        expect(rcon.commands).toContain(execConfig('test'));
      });
    });

    it('should close the rcon connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.configureServer(gameServer as any, game);
      expect(spy).toHaveBeenCalled();
    });

    describe('when player name container non-latin characters', () => {
      beforeEach(async () => {
        player1.name = 'mały';
        await player1.save();
      });

      it('should deburr player name', async () => {
        await service.configureServer(gameServer as any, game);
        expect(rcon.commands).toContain(addGamePlayer(player1.steamId, 'maly', 'blu', 'soldier'));
      });
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      spyOn(rcon, 'send').and.throwError('some random RCON error');
      const spy = jest.spyOn(rcon, 'end');

      await expect(service.configureServer(gameServer as any, game)).rejects.toThrowError();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#cleanupServer()', () => {
    it('should execute correct rcon commands', async () => {
      await service.cleanupServer(gameServer as any);
      expect(rcon.commands).toEqual(expect.arrayContaining([
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
        delAllGamePlayers(),
        disablePlayerWhitelist(),
      ]));
    });

    it('should close the rcon connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.cleanupServer(gameServer as any);
      expect(spy).toHaveBeenCalled();
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      rcon.send = () => { throw new Error('FAKE_ERROR'); }
      const spy = spyOn(rcon, 'end');

      await expect(service.cleanupServer(gameServer as any)).rejects.toThrowError();
      expect(spy).toHaveBeenCalled();
    });
  });
});
