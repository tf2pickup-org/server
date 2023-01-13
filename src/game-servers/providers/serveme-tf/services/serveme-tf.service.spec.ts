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
import { ServemeTfApiService } from './serveme-tf-api.service';
import { ServemeTfService } from './serveme-tf.service';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import {
  ServemeTfReservation,
  ServemeTfReservationDocument,
  servemeTfReservationSchema,
} from '../models/serveme-tf-reservation';
import { waitABit } from '@/utils/wait-a-bit';
import { GameServerReleaseReason } from '@/game-servers/game-server-provider';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./serveme-tf-api.service');

jest.mock('rxjs/operators', () => {
  const operators = jest.requireActual('rxjs/operators');
  return {
    ...operators,
    delay: jest.fn(() => (s: any) => s),
  };
});

describe('ServemeTfService', () => {
  let service: ServemeTfService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let servemeTfReservationModel: Model<ServemeTfReservationDocument>;
  let servemeTfApiService: jest.Mocked<ServemeTfApiService>;
  let gameServersService: jest.Mocked<GameServersService>;
  let events: Events;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: ServemeTfReservation.name,
            schema: servemeTfReservationSchema,
          },
        ]),
      ],
      providers: [
        ServemeTfService,
        GameServersService,
        ServemeTfApiService,
        Events,
      ],
    }).compile();

    service = module.get<ServemeTfService>(ServemeTfService);
    connection = module.get(getConnectionToken());
    servemeTfReservationModel = module.get(
      getModelToken(ServemeTfReservation.name),
    );
    servemeTfApiService = module.get(ServemeTfApiService);
    gameServersService = module.get(GameServersService);
    events = module.get(Events);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    await servemeTfReservationModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register provider', () => {
    expect(gameServersService.registerProvider).toHaveBeenCalledWith(service);
  });

  describe('#getById()', () => {
    let reservationId: Types.ObjectId;

    beforeEach(async () => {
      const reservation = await servemeTfReservationModel.create({
        reservationId: 1250567,
        password: 'FAKE_PASSWORD',
        rcon: 'FAKE_RCON_PASSWORD',
        logsecret: 'FAKE_LOGSECRET',
        steamId: 'FAKE_STEAM_ID',
        server: {
          id: 306,
          name: 'BolusBrigade #12',
          flag: 'de',
          ip: 'bolus.fakkelbrigade.eu',
          port: '27125',
        },
      });

      reservationId = reservation._id;
    });

    it('should return reservation by id', async () => {
      const reservation = await service.getById(reservationId);
      expect(reservation.reservationId).toBe(1250567);
    });
  });

  describe('#findGameServerOptions()', () => {
    beforeEach(() => {
      servemeTfApiService.listServers.mockResolvedValue([
        {
          id: 1,
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
          id: 2,
          name: 'fake_server_2',
          flag: 'de',
          ip: 'localhost',
          port: '27025',
          ip_and_port: 'localhost:27025',
          sdr: false,
          latitude: 0,
          longitude: 0,
        },
      ]);
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
    beforeEach(() => {
      servemeTfApiService.reserveServer.mockResolvedValue({
        reservation: {
          id: 69,
          starts_at: '2014-04-13T18:00:20.415+02:00',
          ends_at: '2014-04-13T20:00:20.415+02:00',
          server_id: 42,
          password: 'FAKE_PASSWORD',
          rcon: 'FAKE_RCON_PASSWORD',
          first_map: 'cp_badlands',
          tv_password: 'FAKE_STV_PASSWORD',
          tv_relaypassword: 'FAKE_RELAYPASSWORD',
          auto_end: true,
          errors: {},
          logsecret: 'FAKE_LOGSECRET',
          steam_uid: 'FAKE_STEAM_UID',
          status: 'Ready',
          server_config_id: null,
          whitelist_id: 'etf2l_6v6',
          custom_whitelist_id: null,
          last_number_of_players: 0,
          inactive_minute_counter: 0,
          start_instantly: true,
          end_instantly: true,
          provisioned: true,
          ended: false,
          server: {
            id: 42,
            name: 'FAKE_SERVER_NAME',
            flag: 'de',
            ip: 'FAKE_SERVER_ADDRESS',
            port: '27015',
            ip_and_port: 'localhost:27025',
            sdr: false,
            latitude: 0,
            longitude: 0,
          },
        },
        actions: {
          delete: 'delete',
          idle_reset: 'idle_reset',
        },
      });
    });

    it('should make the reservation', async () => {
      const gameServer = await service.takeGameServer({
        gameServerId: '42',
        gameId: 'FAKE_GAME_ID',
      });
      expect(servemeTfApiService.reserveServer).toHaveBeenCalledWith(42);
      expect(gameServer).toEqual({
        id: expect.any(String),
        name: 'FAKE_SERVER_NAME',
        address: 'FAKE_SERVER_ADDRESS',
        port: 27015,
      });
    });
  });

  describe('#releaseGameServer()', () => {
    let reservation: Document<ServemeTfReservation>;

    beforeEach(async () => {
      reservation = await servemeTfReservationModel.create({
        reservationId: 1250567,
        password: 'FAKE_PASSWORD',
        rcon: 'FAKE_RCON_PASSWORD',
        logsecret: 'FAKE_LOGSECRET',
        steamId: 'FAKE_STEAM_ID',
        server: {
          id: 306,
          name: 'BolusBrigade #12',
          flag: 'de',
          ip: 'bolus.fakkelbrigade.eu',
          port: '27125',
        },
      });
    });

    it('should end the reservation', async () => {
      jest.useFakeTimers();
      service.releaseGameServer({
        gameServerId: reservation.id,
        gameId: 'FAKE_GAME_ID',
        reason: GameServerReleaseReason.GameEnded,
      });
      jest.runAllTimers();
      jest.useRealTimers();

      await waitABit(100);
      expect(servemeTfApiService.endServerReservation).toHaveBeenCalledWith(
        1250567,
      );
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

      it('should store the gameserver in the model', async () => {
        await service.takeFirstFreeGameServer();
        const gameServer = await servemeTfReservationModel.findOne().orFail();
        expect(gameServer.server.name).toEqual('FAKE_SERVER_NAME');
        expect(gameServer.server.ip).toEqual('FAKE_SERVER_ADDRESS');
        expect(gameServer.server.port).toEqual('27015');
        expect(gameServer.reservationId).toEqual(69);
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
    let reservationId: string;

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
      const controls = await service.getControls(reservationId);
      expect(controls instanceof ServemeTfServerControls).toBe(true);
    });
  });
});
