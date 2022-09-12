import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Game } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { waitABit } from '@/utils/wait-a-bit';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { ServemeTfApiService } from './serveme-tf-api.service';
import { ServemeTfService } from './serveme-tf.service';
import { ServemeTfServerControls } from '../serveme-tf-server-controls';
import {
  ServemeTfReservation,
  ServemeTfReservationDocument,
  servemeTfReservationSchema,
} from '../models/serveme-tf-reservation';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./serveme-tf-api.service');

jest.mock('rxjs/operators', () => {
  const operators = jest.requireActual('rxjs/operators');
  return {
    ...operators,
    delay: jest.fn(() => (s) => s),
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

  describe('#onGameServerAssigned()', () => {
    describe('when a game ends', () => {
      beforeEach(async () => {
        const reservation = await servemeTfReservationModel.create({
          id: 1250567,
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

        const oldGame = new Game();
        oldGame.id = 'FAKE_GAME_ID';
        oldGame.gameServer = {
          id: `${reservation._id}`,
          name: reservation.server.name,
          provider: 'serveme.tf',
          address: reservation.server.ip,
          port: 27125,
        };
        oldGame.state = GameState.started;

        await service.onGameServerAssigned({ gameId: 'FAKE_GAME_ID' });

        const newGame = new Game();
        newGame.id = oldGame.id;
        newGame.gameServer = { ...oldGame.gameServer };
        newGame.state = GameState.ended;

        events.gameChanges.next({ newGame, oldGame });
        await waitABit(100);
      });

      it('should end the reservation', () => {
        expect(servemeTfApiService.endServerReservation).toHaveBeenCalledWith(
          1250567,
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

  describe('#findFirstGameServer()', () => {
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
        await service.findFirstFreeGameServer();
        const gameServer = await servemeTfReservationModel.findOne();
        expect(gameServer.server.name).toEqual('FAKE_SERVER_NAME');
        expect(gameServer.server.ip).toEqual('FAKE_SERVER_ADDRESS');
        expect(gameServer.server.port).toEqual('27015');
        expect(gameServer.id).toEqual(69);
      });

      it('should return the gameserver', async () => {
        const ret = await service.findFirstFreeGameServer();
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
        await expect(service.findFirstFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });
  });
});
