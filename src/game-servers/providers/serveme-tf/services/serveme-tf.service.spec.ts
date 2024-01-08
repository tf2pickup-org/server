import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Document, Model, Types } from 'mongoose';
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

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./serveme-tf-api.service');
jest.mock('@tf2pickup-org/serveme-tf-client');

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServemeTfService,
        GameServersService,
        Events,
        {
          provide: SERVEME_TF_CLIENT,
          useValue: {
            reserveServer: jest.fn(),
            endServerReservation: jest.fn(),
            listServers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServemeTfService>(ServemeTfService);
    gameServersService = module.get(GameServersService);
    servemeTfClient = module.get(SERVEME_TF_CLIENT);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register provider', () => {
    expect(gameServersService.registerProvider).toHaveBeenCalledWith(service);
  });

  describe('#findGameServerOptions()', () => {
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
          {
            id: 2 as ServerId,
            name: 'fake_server_2',
            flag: 'de',
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
          flag: 'de',
        },
      ]);
    });
  });

  describe('#takeGameServer()', () => {
    let reservation: jest.Mocked<Reservation>;

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
          name: 'BolusBrigade #12',
          flag: 'de',
          ip: 'bolus.fakkelbrigade.eu',
          port: '27125',
        } as ServerOption,
        end: jest.fn(),
      } as any;

      servemeTfClient.create.mockResolvedValue(reservation);
    });

    it('should make the reservation', async () => {
      const gameServer = await service.takeGameServer({
        gameServerId: '42',
        gameId: new Types.ObjectId() as GameId,
      });
      expect(servemeTfClient.create).toHaveBeenCalledWith({
        serverId: 42,
      });
      expect(gameServer).toEqual({
        id: expect.any(String),
        name: 'FAKE_SERVER_NAME',
        address: 'FAKE_SERVER_ADDRESS',
        port: 27015,
      });
    });
  });

  describe('#releaseGameServer()', () => {
    let reservation: jest.Mocked<Reservation>;

    beforeEach(async () => {
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
          name: 'BolusBrigade #12',
          flag: 'de',
          ip: 'bolus.fakkelbrigade.eu',
          port: '27125',
        } as ServerOption,
        end: jest.fn(),
      } as any;

      servemeTfClient.create.mockResolvedValue(reservation);
    });

    it('should end the reservation', async () => {
      jest.useFakeTimers();
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
    describe('when the reservation is successful', () => {
      beforeEach(() => {
        servemeTfApiService.reserveServer.mockResolvedValue({
          reservation: {
            id: 69,
            starts_at: '2014-04-13T18:00:20.415+02:00',
            ends_at: '2014-04-13T20:00:20.415+02:00',
            password: 'FAKE_PASSWORD',
            rcon: 'FAKE_RCON_PASSWORD',
            logsecret: 'FAKE_LOGSECRET',
            steam_uid: 'FAKE_STEAM_UID',
            server: {
              id: 42,
              name: 'FAKE_SERVER_NAME',
              ip: 'FAKE_SERVER_ADDRESS',
              port: '27015',
            },
          },
        } as any);
      });

      it('should return the gameserver', async () => {
        const ret = await service.takeFirstFreeGameServer();
        expect(ret).toBeTruthy();
        expect(ret.name).toEqual('FAKE_SERVER_NAME');
      });
    });

    describe('when the reservation fails', () => {
      beforeEach(() => {
        servemeTfApiService.reserveServer.mockRejectedValue(
          new Error('FAKE_SERVEME_TF_ERROR'),
        );
      });

      it('should throw', async () => {
        await expect(service.takeFirstFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });
  });

  describe('#getControls()', () => {
    let reservationId: ServemeTfReservation['_id'];

    beforeEach(async () => {
      const reservation = await servemeTfReservationModel.create({
        name: 'BolusBrigade #12',
        address: 'bolus.fakkelbrigade.eu',
        port: '27125',
        reservation: {
          id: 1250567,
          startsAt: new Date('2022-05-05T09:39:11.279Z'),
          endsAt: new Date('2022-05-05T11:39:11.049Z'),
          serverId: 307,
          password: 'FAKE_PASSWORD',
          rcon: 'FAKE_RCON_PASSWORD',
          logsecret: 'FAKE_LOGSECRET',
          steamId: 'FAKE_STEAM_ID',
        },
      });
      reservationId = reservation._id;
    });

    it('should return controls', async () => {
      const controls = await service.getControls(reservationId!.toString());
      expect(controls instanceof ServemeTfServerControls).toBe(true);
    });
  });
});
