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
import { plainToInstance } from 'class-transformer';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import { Subject } from 'rxjs';
import {
  ServemeTfGameServer,
  ServemeTfGameServerDocument,
  servemeTfGameServerSchema,
} from '../models/serveme-tf-game-server';
import { ServemeTfApiService } from './serveme-tf-api.service';
import { ServemeTfService } from './serveme-tf.service';

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
  let servemeTfGameServerModel: Model<ServemeTfGameServerDocument>;
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
            name: ServemeTfGameServer.name,
            schema: servemeTfGameServerSchema,
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
    servemeTfGameServerModel = module.get(
      getModelToken(ServemeTfGameServer.name),
    );
    servemeTfApiService = module.get(ServemeTfApiService);
    gameServersService = module.get(GameServersService);
    events = module.get(Events);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    await servemeTfGameServerModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register provider', () => {
    expect(gameServersService.registerProvider).toHaveBeenCalledWith(service);
  });

  describe('when a server is released', () => {
    beforeEach(() => {
      const oldGameServer = plainToInstance(ServemeTfGameServer, {
        provider: 'serveme.tf',
        game: new Types.ObjectId(),
        reservation: {
          id: 42,
        },
      });

      const newGameServer = plainToInstance(ServemeTfGameServer, {
        provider: 'serveme.tf',
        reservation: {
          id: 42,
        },
      });

      events.gameServerUpdated.next({ oldGameServer, newGameServer });
    });

    it('should end the reservation', () => {
      expect(servemeTfApiService.endServerReservation).toHaveBeenCalledWith(42);
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
        const gameServer = await servemeTfGameServerModel.findOne();
        expect(gameServer.name).toEqual('FAKE_SERVER_NAME');
        expect(gameServer.address).toEqual('FAKE_SERVER_ADDRESS');
        expect(gameServer.port).toEqual('27015');
        expect(gameServer.reservation.id).toEqual(69);
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
