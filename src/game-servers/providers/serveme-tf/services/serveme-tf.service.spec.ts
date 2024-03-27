import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ServemeTfService } from './serveme-tf.service';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import { waitABit } from '@/utils/wait-a-bit';
import { GameServerReleaseReason } from '@/game-servers/game-server-provider';
import { GameId } from '@/games/types/game-id';
import {
  Client,
  Reservation,
  ServerId,
  ServerOption,
} from '@tf2pickup-org/serveme-tf-client';
import { SERVEME_TF_CLIENT } from '../serveme-tf-client.token';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('@tf2pickup-org/serveme-tf-client');
jest.mock('./serveme-tf-configuration.service');

jest.mock('rxjs/operators', () => {
  const operators = jest.requireActual('rxjs/operators');
  return {
    ...operators,
    delay: jest.fn(() => (s: any) => s),
  };
});

describe('ServemeTfService', () => {
  let service: ServemeTfService;
  let gameServersService: jest.Mocked<GameServersService>;
  let servemeTfClient: jest.Mocked<Client>;
  let reservation: jest.Mocked<Reservation>;
  let servemeTfConfigurationService: jest.Mocked<ServemeTfConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServemeTfService,
        GameServersService,
        {
          provide: SERVEME_TF_CLIENT,
          useValue: {
            findOptions: jest.fn(),
            create: jest.fn(),
            fetch: jest.fn(),
          },
        },
        ServemeTfConfigurationService,
      ],
    }).compile();

    service = module.get<ServemeTfService>(ServemeTfService);
    gameServersService = module.get(GameServersService);
    servemeTfClient = module.get(SERVEME_TF_CLIENT);
    servemeTfConfigurationService = module.get(ServemeTfConfigurationService);
  });

  beforeEach(() => {
    reservation = {
      id: 69,
      startsAt: new Date('2022-05-05T09:39:11.279Z'),
      endsAt: new Date('2022-05-05T11:39:11.049Z'),
      serverId: 307 as ServerId,
      password: 'FAKE_PASSWORD',
      rcon: 'FAKE_RCON_PASSWORD',
      logSecret: 'FAKE_LOGSECRET',
      reservedBy: 'FAKE_STEAM_ID',
      server: {
        id: 42 as ServerId,
        name: 'FAKE_SERVER_NAME',
        flag: 'de',
        ip: 'FAKE_SERVER_ADDRESS',
        port: '27125',
      } as ServerOption,
      end: jest.fn().mockResolvedValue(reservation),
    } as any;
    servemeTfClient.create.mockResolvedValue(reservation);
    servemeTfClient.fetch.mockResolvedValue(reservation);

    servemeTfClient.findOptions.mockResolvedValue({
      servers: [
        {
          id: 1 as ServerId,
          name: 'fake_server_1',
          flag: 'de',
          ip: 'localhost',
          port: '27015',
          ip_and_port: 'localhost:27015',
          sdr: false,
          latitude: 0,
          longitude: 0,
        },
        {
          id: 2 as ServerId,
          name: 'fake_server_2',
          flag: 'fr',
          ip: 'localhost',
          port: '27025',
          ip_and_port: 'localhost:27025',
          sdr: false,
          latitude: 0,
          longitude: 0,
        },
      ],
      serverConfigs: [],
      whitelists: [],
    });

    servemeTfConfigurationService.getPreferredRegion.mockResolvedValue(
      undefined,
    );
    servemeTfConfigurationService.getBannedGameservers.mockResolvedValue([]);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register provider', () => {
    expect(gameServersService.registerProvider).toHaveBeenCalledWith(service);
  });

  describe('#findGameServerOptions()', () => {
    it('should return all available gameservers', async () => {
      const ret = await service.findGameServerOptions();
      expect(ret).toEqual([
        {
          id: '1',
          name: 'fake_server_1',
          address: 'localhost',
          port: 27015,
          flag: 'de',
        },
        {
          id: '2',
          name: 'fake_server_2',
          address: 'localhost',
          port: 27025,
          flag: 'fr',
        },
      ]);
    });
  });

  describe('#takeGameServer()', () => {
    it('should make the reservation', async () => {
      const gameServer = await service.takeGameServer({
        gameServerId: '42',
        gameId: new Types.ObjectId() as GameId,
        map: 'cp_badlands',
      });
      expect(servemeTfClient.create).toHaveBeenCalledWith({
        serverId: 42,
        enableDemosTf: true,
        enablePlugins: true,
        firstMap: 'cp_badlands',
      });
      expect(gameServer).toEqual({
        id: expect.any(String),
        name: 'FAKE_SERVER_NAME',
        address: 'FAKE_SERVER_ADDRESS',
        port: 27125,
      });
    });
  });

  describe('#releaseGameServer()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should end the reservation', async () => {
      service.releaseGameServer({
        gameServerId: '69',
        gameId: new Types.ObjectId() as GameId,
        reason: GameServerReleaseReason.GameEnded,
      });
      jest.runAllTimers();
      jest.useRealTimers();
      await waitABit(100);
      expect(reservation.end).toHaveBeenCalled();
    });
  });

  describe('#takeFirstFreeGameServer()', () => {
    it('should return the gameserver', async () => {
      const ret = await service.takeFirstFreeGameServer({
        gameId: new Types.ObjectId() as GameId,
        map: 'cp_badlands',
      });
      expect(ret).toBeTruthy();
      expect(ret.name).toEqual('FAKE_SERVER_NAME');
    });

    describe('when there is a preferred region', () => {
      beforeEach(() => {
        servemeTfConfigurationService.getPreferredRegion.mockResolvedValue(
          'de',
        );
      });

      it('should return the gameserver', async () => {
        const ret = await service.takeFirstFreeGameServer({
          gameId: new Types.ObjectId() as GameId,
          map: 'cp_badlands',
        });
        expect(ret).toBeTruthy();
        expect(servemeTfClient.create).toHaveBeenCalledWith({
          serverId: 1, // make sure we are taking German server
          enableDemosTf: true,
          enablePlugins: true,
          firstMap: 'cp_badlands',
        });
      });

      describe('and no matching server is available', () => {
        beforeEach(() => {
          servemeTfClient.findOptions.mockResolvedValue({
            servers: [
              {
                id: 2 as ServerId,
                name: 'fake_server_2',
                flag: 'fr',
                ip: 'localhost',
                port: '27025',
                ip_and_port: 'localhost:27025',
                sdr: false,
                latitude: 0,
                longitude: 0,
              },
            ],
            serverConfigs: [],
            whitelists: [],
          });
        });

        it('should throw an error', async () => {
          await expect(
            service.takeFirstFreeGameServer({
              gameId: new Types.ObjectId() as GameId,
              map: 'cp_badlands',
            }),
          ).rejects.toThrow(NoFreeGameServerAvailableError);
        });
      });
    });

    describe('when there are banned gameservers', () => {
      beforeEach(() => {
        servemeTfConfigurationService.getBannedGameservers.mockResolvedValue([
          'fake_server_1',
        ]);
      });

      it('should return the gameserver', async () => {
        const ret = await service.takeFirstFreeGameServer({
          gameId: new Types.ObjectId() as GameId,
          map: 'cp_badlands',
        });
        expect(ret).toBeTruthy();
        expect(servemeTfClient.create).toHaveBeenCalledWith({
          serverId: 2, // make sure we are not taking banned server
          enableDemosTf: true,
          enablePlugins: true,
          firstMap: 'cp_badlands',
        });
      });

      describe('and no matching server is available', () => {
        beforeEach(() => {
          servemeTfClient.findOptions.mockResolvedValue({
            servers: [
              {
                id: 1 as ServerId,
                name: 'fake_server_1',
                flag: 'de',
                ip: 'localhost',
                port: '27015',
                ip_and_port: 'localhost:27015',
                sdr: false,
                latitude: 0,
                longitude: 0,
              },
            ],
            serverConfigs: [],
            whitelists: [],
          });
        });

        it('should throw an error', async () => {
          await expect(
            service.takeFirstFreeGameServer({
              gameId: new Types.ObjectId() as GameId,
              map: 'cp_badlands',
            }),
          ).rejects.toThrow(NoFreeGameServerAvailableError);
        });
      });
    });

    describe('when the reservation fails', () => {
      beforeEach(() => {
        servemeTfClient.create.mockRejectedValue(new Error('FAKE_ERROR'));
      });

      it('should throw', async () => {
        await expect(
          service.takeFirstFreeGameServer({
            gameId: new Types.ObjectId() as GameId,
            map: 'cp_badlands',
          }),
        ).rejects.toThrow(NoFreeGameServerAvailableError);
      });
    });
  });

  describe('#getControls()', () => {
    it('should return controls', async () => {
      const controls = await service.getControls(`${reservation.id}`);
      expect(controls instanceof ServemeTfServerControls).toBe(true);
    });
  });
});
