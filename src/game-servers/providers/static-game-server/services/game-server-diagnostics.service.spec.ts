import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Error, Model, Types } from 'mongoose';
import { LogForwarding } from '../diagnostic-checks/log-forwarding';
import { RconConnection } from '../diagnostic-checks/rcon-connection';
import {
  GameServerDiagnosticRun,
  GameServerDiagnosticRunDocument,
  gameServerDiagnosticRunSchema,
} from '../models/game-server-diagnostic-run';
import { GameServerDiagnosticsService } from './game-server-diagnostics.service';
import { GameServersService } from '../../../services/game-servers.service';

jest.mock('../../../services/game-servers.service');
jest.mock('../diagnostic-checks/log-forwarding');
jest.mock('../diagnostic-checks/rcon-connection');

describe('GameServerDiagnosticsService', () => {
  let service: GameServerDiagnosticsService;
  let mongod: MongoMemoryServer;
  let gameServerDiagnosticRunModel: Model<GameServerDiagnosticRunDocument>;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: GameServerDiagnosticRun.name,
            schema: gameServerDiagnosticRunSchema,
          },
        ]),
      ],
      providers: [
        GameServerDiagnosticsService,
        GameServersService,
        RconConnection,
        LogForwarding,
      ],
    }).compile();

    service = module.get<GameServerDiagnosticsService>(
      GameServerDiagnosticsService,
    );
    gameServerDiagnosticRunModel = module.get(
      getModelToken(GameServerDiagnosticRun.name),
    );
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await gameServerDiagnosticRunModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getDiagnosticRunById()', () => {
    describe('when the given run exists', () => {
      let id: string;

      beforeEach(async () => {
        id = (
          await gameServerDiagnosticRunModel.create({
            gameServer: new Types.ObjectId().toString(),
            checks: [],
          })
        ).id;
      });

      it('should return the given run', async () => {
        const run = await service.getDiagnosticRunById(id);
        expect(run).toBeTruthy();
      });
    });

    describe('when the given run does not exist', () => {
      it('should throw an error', async () => {
        await expect(() =>
          service.getDiagnosticRunById(new Types.ObjectId().toString()),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });
  });
});
