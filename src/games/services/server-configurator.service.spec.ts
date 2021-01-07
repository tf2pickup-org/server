import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { RconFactoryService } from './rcon-factory.service';
import { logAddressAdd, kickAll, changelevel, execConfig, addGamePlayer, enablePlayerWhitelist, tvPort, tvPassword,
  logAddressDel, delAllGamePlayers, disablePlayerWhitelist, tftrueWhitelistId } from '../utils/rcon-commands';
import { QueueConfig } from '@/queue/queue-config';
import { Tf2Team } from '../models/tf2-team';
import { Game } from '../models/game';
import { ObjectId } from 'mongodb';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

class EnvironmentStub {
  logRelayAddress = 'FAKE_RELAY_ADDRESS';
  logRelayPort = '1234';
}

class PlayersServiceStub {
  players = new Map<string, any>([
    ['PLAYER_1', { steamId: 'PLAYER_1_STEAMID', name: 'PLAYER_1_NAME' }],
    ['PLAYER_2', { steamId: 'PLAYER_2_STEAMID', name: 'PLAYER_2_NAME' }],
  ]);
  getById(id: string) { return this.players.get(id); }
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
  send(cmd: string) { return null; }
  end() { return null; }
}

class RconFactoryServiceStub {
  createRcon() { return new RconStub(); }
}

const gameServer = {
  name: 'FAKE_SERVER',
};

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;
  let rconFactoryService: RconFactoryServiceStub;
  let playersService: PlayersServiceStub;
  let queueConfigService: QueueConfigServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerConfiguratorService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: RconFactoryService, useClass: RconFactoryServiceStub },
      ],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
    rconFactoryService = module.get(RconFactoryService);
    playersService = module.get(PlayersService);
    queueConfigService = module.get(QueueConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#configureServer()', () => {
    let rcon: RconStub;
    let game: Game;

    beforeEach(() => {
      game = new Game();
      game.launchedAt = new Date();
      game.number = 1;
      game.slots = [
        {
          // @ts-expect-error
          player: 'PLAYER_1',
          team: Tf2Team.blu,
          gameClass: Tf2ClassName.soldier,
          status: SlotStatus.active,
        },
        {
          // @ts-expect-error
          player: 'PLAYER_2',
          team: Tf2Team.red,
          gameClass: Tf2ClassName.soldier,
          status: SlotStatus.active,
        },
      ];
      game.map = 'cp_badlands';

      rcon = new RconStub();
      jest.spyOn(rconFactoryService, 'createRcon').mockResolvedValue(rcon as never);
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout').mockImplementation(cb => { cb(); return null; });
    });

    it('should execute correct rcon commands', async () => {
      const spy = jest.spyOn(rcon, 'send');
      await service.configureServer(gameServer as any, game);

      expect(spy).toHaveBeenCalledWith(logAddressAdd('FAKE_RELAY_ADDRESS:1234'));
      expect(spy).toHaveBeenCalledWith(kickAll());
      expect(spy).toHaveBeenCalledWith(changelevel('cp_badlands'));
      expect(spy).toHaveBeenCalledWith(execConfig('etf2l_6v6_5cp'));
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^sv_password\s.+$/));
      expect(spy).toHaveBeenCalledWith(addGamePlayer('PLAYER_1_STEAMID', 'PLAYER_1_NAME', Tf2Team.blu, 'soldier'));
      expect(spy).toHaveBeenCalledWith(addGamePlayer('PLAYER_2_STEAMID', 'PLAYER_2_NAME', Tf2Team.red, 'soldier'));
      expect(spy).toHaveBeenCalledWith(enablePlayerWhitelist());
      expect(spy).toHaveBeenCalledWith(tvPort());
      expect(spy).toHaveBeenCalledWith(tvPassword());
    });

    describe('when the whitelistId is set', () => {
      beforeEach(() => {
        queueConfigService.queueConfig.whitelistId = 'FAKE_WHITELIST_ID';
      });

      it('should set the whitelist', async () => {
        const spy = jest.spyOn(rcon, 'send');
        await service.configureServer(gameServer as any, game as any);
        expect(spy).toHaveBeenCalledWith(tftrueWhitelistId('FAKE_WHITELIST_ID'));
      });
    });

    describe('when the execConfigs is set', () => {
      beforeEach(() => {
        queueConfigService.queueConfig.execConfigs = [ 'test' ];
      });

      it('should execute the configs', async () => {
        const spy = jest.spyOn(rcon, 'send');
        await service.configureServer(gameServer as any, game as any);
        expect(spy).toHaveBeenCalledWith(execConfig('test'));
      });
    });

    describe('when one of the players is replaced', () => {
      beforeEach(() => {
        game.slots = [
          {
            // @ts-expect-error
            player: 'PLAYER_1',
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
          },
          {
            // @ts-expect-error
            player: 'PLAYER_2',
            team: Tf2Team.red,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.replaced,
          },
        ];
      });

      it('should not add this player to the game', async () => {
        const spy = jest.spyOn(rcon, 'send');
        await service.configureServer(gameServer as any, game);

        expect(spy).toHaveBeenCalledWith(addGamePlayer('PLAYER_1_STEAMID', 'PLAYER_1_NAME', Tf2Team.blu, 'soldier'));
        expect(spy).not.toHaveBeenCalledWith(addGamePlayer('PLAYER_2_STEAMID', 'PLAYER_2_NAME', Tf2Team.red, 'soldier'));
      });
    });

    it('should close the rcon connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.configureServer(gameServer as any, game as any);
      expect(spy).toHaveBeenCalled();
    });

    it('should deburr player nicknames', async () => {
      playersService.players.get('PLAYER_1').name = 'mały';
      const spy = jest.spyOn(rcon, 'send');

      await service.configureServer(gameServer as any, game as any);
      expect(spy).toHaveBeenCalledWith(addGamePlayer('PLAYER_1_STEAMID', 'maly', Tf2Team.blu, 'soldier'));
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      jest.spyOn(rcon, 'send').mockRejectedValue('some random RCON error');
      const spy = jest.spyOn(rcon, 'end');

      await expect(service.configureServer(gameServer as any, game as any)).rejects.toThrowError();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#cleanupServer()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();
      jest.spyOn(rconFactoryService, 'createRcon').mockResolvedValue(rcon as never);
    });

    it('should execute correct rcon commands', async () => {
      const spy = jest.spyOn(rcon, 'send');
      await service.cleanupServer(gameServer as any);

      expect(spy).toHaveBeenCalledWith(logAddressDel('FAKE_RELAY_ADDRESS:1234'));
      expect(spy).toHaveBeenCalledWith(delAllGamePlayers());
      expect(spy).toHaveBeenCalledWith(disablePlayerWhitelist());
    });

    it('should close the rcon connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.cleanupServer(gameServer as any);
      expect(spy).toHaveBeenCalled();
    });

    it('should close the rcon connection even though an RCON command failed', async () => {
      jest.spyOn(rcon, 'send').mockRejectedValue('some random RCON error');
      const spy = jest.spyOn(rcon, 'end');

      await expect(service.cleanupServer(gameServer as any)).rejects.toThrowError();
      expect(spy).toHaveBeenCalled();
    });
  });
});
