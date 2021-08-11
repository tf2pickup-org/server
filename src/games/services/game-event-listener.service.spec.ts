import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { Environment } from '@/environment/environment';
import { GameEventHandlerService } from './game-event-handler.service';
import { GamesService } from './games.service';
import { LogReceiver } from 'srcds-log-receiver';
import { EventEmitter } from 'events';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Game, GameDocument, gameSchema } from '../models/game';
import { Model } from 'mongoose';

jest.mock('./game-event-handler.service');
jest.mock('./games.service');

class EnvironmentStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

class LogReceiverStub extends EventEmitter {
  opts = {
    address: '127.0.0.1',
    port: 1234,
  };

  mockEvent(message: string) {
    this.emit('data', {
      isValid: true,
      password: 'SOME_LOG_SECRET',
      message,
    });
  }
}

const waitABit = async () => new Promise((resolve) => setTimeout(resolve, 10));

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;
  let gameEventHandlerService: GameEventHandlerService;
  let logReceiver: LogReceiverStub;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let gameModel: Model<GameDocument>;
  let game: GameDocument;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [
        GameEventListenerService,
        { provide: Environment, useClass: EnvironmentStub },
        GameEventHandlerService,
        GamesService,
        { provide: LogReceiver, useClass: LogReceiverStub },
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
    gameEventHandlerService = module.get(GameEventHandlerService);
    logReceiver = module.get(LogReceiver);
    gameModel = module.get(getModelToken(Game.name));
    gamesService = module.get(GamesService);

    service.onModuleInit();
  });

  beforeEach(async () => {
    // @ts-expect-error
    game = await gamesService._createOne();
    game.logSecret = 'SOME_LOG_SECRET';
    await game.save();
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO These below are e2e tests - we should move them there
  describe('should handle game events', () => {
    it('match started', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onMatchStarted')
          .mockImplementation((gameId) => {
            expect(gameId).toEqual(game.id);
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:40:20: World triggered "Round_Start"',
        );
      }));

    it('match ended', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onMatchEnded')
          .mockImplementation((gameId) => {
            expect(gameId).toEqual(game.id);
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:49: World triggered "Game_Over" reason "Reached Time Limit"',
        );
      }));

    it('logs uploaded', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onLogsUploaded')
          .mockImplementation((gameId, logsUrl) => {
            expect(gameId).toEqual(game.id);
            expect(logsUrl).toEqual('http://logs.tf/2458457');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:52: [TFTrue] The log is available here: http://logs.tf/2458457. Type !log to view it.',
        );
      }));

    it('demo uploaded', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onDemoUploaded')
          .mockImplementation((gameId, demoUrl) => {
            expect(gameId).toEqual(game.id);
            expect(demoUrl).toEqual('https://demos.tf/427407');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '06/19/2020 - 00:04:28: [demos.tf]: STV available at: https://demos.tf/427407',
        );
      }));

    it('player connected', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onPlayerJoining')
          .mockImplementation((gameId, steamId) => {
            expect(gameId).toEqual(game.id);
            expect(steamId).toEqual('76561198074409147');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:03:44: "mały #tf2pickup.pl<366><[U:1:114143419]><>" connected, address "83.29.150.132:27005"',
        );
      }));

    it('player joined team', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onPlayerConnected')
          .mockImplementation((gameId, steamId) => {
            expect(gameId).toEqual(game.id);
            expect(steamId).toEqual('76561198074409147');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:03:51: "maly<366><[U:1:114143419]><Unassigned>" joined team "Blue"',
        );
      }));

    it('player disconnected', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onPlayerDisconnected')
          .mockImplementation((gameId, steamId) => {
            expect(gameId).toEqual(game.id);
            expect(steamId).toEqual('76561198074409147');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:43: "maly<366><[U:1:114143419]><Blue>" disconnected (reason "Disconnect by user.")',
        );
      }));

    it('score reported', async () =>
      new Promise<void>((resolve) => {
        jest
          .spyOn(gameEventHandlerService, 'onScoreReported')
          .mockImplementation((gameId, teamName, score) => {
            expect(gameId).toEqual(game.id);
            expect(teamName).toEqual('Blue');
            expect(score).toEqual('2');
            resolve();
            return null;
          });
        logReceiver.mockEvent(
          '01/26/2020 - 20:38:49: Team "Blue" final score "2" with "3" players',
        );
      }));
  });

  it('should discard invalid messages', async () =>
    new Promise<void>((resolve) => {
      const spy = jest.spyOn(gameEventHandlerService, 'onMatchStarted');
      logReceiver.emit('data', {
        isValid: false,
        password: 'SOME_LOG_SECRET',
        message: '01/26/2020 - 20:40:20: World triggered "Round_Start"',
      });

      setTimeout(() => {
        expect(spy).not.toHaveBeenCalled();
        resolve();
      }, 1000);
    }));
});
