import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { mongoose, ReturnModelType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { Subject } from 'rxjs';
import { GameServerDiagnosticRun } from '../models/game-server-diagnostic-run';
import { GameServerDiagnosticsService } from './game-server-diagnostics.service';
import { GameServersService } from './game-servers.service';

jest.mock('./game-servers.service');
jest.mock('../game-server-diagnostic-runner', () => ({
  GameServerDiagnosticRunner: jest.fn().mockImplementation(() => {
    return {
      run: new Subject<GameServerDiagnosticRun>(),
    };
  }),
}));

describe('GameServerDiagnosticsService', () => {
  let service: GameServerDiagnosticsService;
  let mongod: MongoMemoryServer;
  let gameServerDiagnosticRunModel: ReturnModelType<typeof GameServerDiagnosticRun>;
  let gameServersService: jest.Mocked<GameServersService>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([GameServerDiagnosticRun]),
      ],
      providers: [
        GameServerDiagnosticsService,
        GameServersService,
      ],
    }).compile();

    service = module.get<GameServerDiagnosticsService>(GameServerDiagnosticsService);
    gameServerDiagnosticRunModel = module.get(getModelToken(GameServerDiagnosticRun.name));
    gameServersService = module.get(GameServersService);
  });

  afterEach(async () => {
    await gameServerDiagnosticRunModel.deleteMany({ });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getDiagnosticRunById()', () => {
    describe('when the given run exists', () => {
      let id: string;

      beforeEach(async () => {
        id = (await gameServerDiagnosticRunModel.create({ gameServer: new mongoose.Types.ObjectId().toString(), checks: [] })).id;
      });

      it('should return the given run', async () => {
        const run = await service.getDiagnosticRunById(id);
        expect(run).toBeTruthy();
      });
    });

    describe('when the given run does not exist', () => {
      it('should throw an error', async () => {
        await expect(() => service.getDiagnosticRunById(new mongoose.Types.ObjectId().toString())).rejects
          .toThrow(mongoose.Error.DocumentNotFoundError);
      });
    });
  });

  describe('#runDiagnostics()', () => {
    let gameServerId: string;

    beforeEach(() => {
      gameServerId = new mongoose.Types.ObjectId().toString();
      gameServersService.getById.mockResolvedValue({
        id: gameServerId,
        name: 'FAKE_SERVER',
        address: 'http://127.0.0.1',
        port: '27015',
        rconPassword: 'FAKE_RCON_PASSWORD',
        resolvedIpAddresses: ['127.0.0.1'],
      });
    });

    it('should create new diagnostic run', async () => {
      const id = await service.runDiagnostics(gameServerId);
      expect(id).toBeTruthy();
      expect(await gameServerDiagnosticRunModel.findById(id)).toBeTruthy();
    });

    describe('when created', () => {
      let diagnosticRunId: string;

      beforeEach(async () => {
        diagnosticRunId = await service.runDiagnostics(gameServerId);
      });

      it('should return this diagnostic run in getDiagnosticRunObservable()', () => {
        expect(service.getDiagnosticRunObservable(diagnosticRunId)).toBeTruthy();
      });
    });
  });
});
