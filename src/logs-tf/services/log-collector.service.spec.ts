import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { LogMessage } from '@/log-receiver/types/log-message';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { waitABit } from '@/utils/wait-a-bit';
import { CacheModule, CACHE_MANAGER } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { Subject, take } from 'rxjs';
import { LogCollectorService } from './log-collector.service';
import { LogsTfApiService } from './logs-tf-api.service';

jest.mock('@/log-receiver/services/log-receiver.service');
jest.mock('@/games/services/games.service');
jest.mock('./logs-tf-api.service');
jest.mock('@/environment/environment', () => ({
  Environment: jest.fn().mockImplementation(() => ({
    websiteName: 'FAKE_WEBSITE',
  })),
}));

describe('LogCollectorService', () => {
  let service: LogCollectorService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let logReceiverService: jest.Mocked<LogReceiverService>;
  let log: Subject<LogMessage>;
  let cache: Cache;
  let gamesService: GamesService;
  let mockGame: GameDocument;
  let events: Events;
  let logsTfApiService: jest.Mocked<LogsTfApiService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    log = new Subject();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [
        LogCollectorService,
        LogReceiverService,
        GamesService,
        Events,
        LogsTfApiService,
        Environment,
        Events,
      ],
    }).compile();

    service = module.get<LogCollectorService>(LogCollectorService);
    connection = module.get(getConnectionToken());
    logReceiverService = module.get(LogReceiverService);
    cache = module.get(CACHE_MANAGER);
    gamesService = module.get(GamesService);
    events = module.get(Events);
    logsTfApiService = module.get(LogsTfApiService);

    (logReceiverService.data as unknown as Subject<LogMessage>) = log;
  });

  beforeEach(async () => {
    // @ts-expect-error
    mockGame = await gamesService._createOne();
    mockGame.logSecret = 'FAKE_LOGSECRET';
    await mockGame.save();
  });

  beforeEach(() => service.onModuleInit());
  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a log line appears', () => {
    beforeEach(async () => {
      log.next({
        password: 'FAKE_LOGSECRET',
        payload: 'FAKE_LOG_PAYLOAD',
      });
      await waitABit(100);
    });

    it('should append the log line', async () => {
      const logFile = await cache.get(`games/${mockGame.id}/logs`);
      expect(logFile).toEqual('L FAKE_LOG_PAYLOAD');
    });
  });

  describe('when the game ends', () => {
    let logsUploaded: string;

    beforeEach(async () => {
      logsTfApiService.uploadLogs.mockResolvedValue('FAKE_LOGS_URL');

      events.logsUploaded
        .pipe(take(1))
        .subscribe(({ logsUrl }) => (logsUploaded = logsUrl));

      log.next({
        password: 'FAKE_LOGSECRET',
        payload: 'LOG_LINE_1',
      });
      log.next({
        password: 'FAKE_LOGSECRET',
        payload: 'LOG_LINE_2',
      });
      events.matchEnded.next({ gameId: mockGame.id });
      await waitABit(100);
    });

    it('should attempt to upload logs', async () => {
      expect(logsTfApiService.uploadLogs).toHaveBeenCalledWith({
        mapName: 'cp_badlands',
        gameNumber: mockGame.number,
        logFile: 'L LOG_LINE_1\nL LOG_LINE_2',
      });
      expect(logsUploaded).toEqual('FAKE_LOGS_URL');
    });

    it('should clear cache', async () => {
      expect(await cache.get(`games/${mockGame.id}/logs`)).toBe(undefined);
    });

    describe('when the upload fails', () => {
      beforeEach(() => {
        logsTfApiService.uploadLogs.mockRejectedValue('FAKE_ERROR');
      });

      // eslint-disable-next-line jest/expect-expect, @typescript-eslint/no-empty-function
      it('should handle gracefully', async () => {});
    });
  });
});
