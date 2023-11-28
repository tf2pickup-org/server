import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { Environment } from '@/environment/environment';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { Subject, take } from 'rxjs';
import { Events } from '@/events/events';
import { GameDocument, Game, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { Tf2Team } from '@/games/models/tf2-team';

jest.mock('@/games/services/games.service');
jest.mock('@/log-receiver/services/log-receiver.service');

class EnvironmentStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let gameModel: Model<GameDocument>;
  let game: GameDocument;
  let logReceiverService: jest.Mocked<LogReceiverService>;
  let connection: Connection;
  let events: Events;
  let gameLogs: Subject<any>;

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
        GamesService,
        LogReceiverService,
        Events,
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
    gameModel = module.get(getModelToken(Game.name));
    gamesService = module.get(GamesService);
    logReceiverService = module.get(LogReceiverService);
    connection = module.get(getConnectionToken());
    events = module.get(Events);

    gameLogs = new Subject<any>();
    Object.defineProperty(logReceiverService, 'data', {
      get: jest.fn().mockReturnValue(gameLogs),
    });

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
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO These below are e2e tests - we should move them there
  describe('should handle game events', () => {
    it('match started', () =>
      new Promise<void>((resolve) => {
        events.matchStarted.pipe(take(1)).subscribe(({ gameId }) => {
          expect(gameId.equals(game._id)).toBe(true);
          resolve();
        });
        gameLogs.next({
          payload: '01/26/2020 - 20:40:20: World triggered "Round_Start"',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('round win', () =>
      new Promise<void>((resolve) => {
        events.roundWin.pipe(take(1)).subscribe(({ gameId, winner }) => {
          expect(gameId.equals(game._id)).toBe(true);
          expect(winner).toEqual(Tf2Team.blu);
          resolve();
        });
        gameLogs.next({
          payload:
            '11/28/2023 - 08:47:40: World triggered "Round_Win" (winner "Blue")',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('round length', () =>
      new Promise<void>((resolve) => {
        events.roundLength.pipe(take(1)).subscribe(({ gameId, lengthMs }) => {
          expect(gameId.equals(game._id)).toBe(true);
          expect(lengthMs).toEqual(779340);
          resolve();
        });
        gameLogs.next({
          payload:
            '11/28/2023 - 08:47:40: World triggered "Round_Length" (seconds "779.34")',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('match ended', () =>
      new Promise<void>((resolve) => {
        events.matchEnded.pipe(take(1)).subscribe(({ gameId }) => {
          expect(gameId.equals(game._id)).toBe(true);
          resolve();
        });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:38:49: World triggered "Game_Over" reason "Reached Time Limit"',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('logs uploaded', () =>
      new Promise<void>((resolve) => {
        events.logsUploaded.pipe(take(1)).subscribe(({ gameId, logsUrl }) => {
          expect(gameId.equals(game._id)).toBe(true);
          expect(logsUrl).toEqual('http://logs.tf/2458457');
          resolve();
        });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:38:52: [TFTrue] The log is available here: http://logs.tf/2458457. Type !log to view it.',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('demo uploaded', () =>
      new Promise<void>((resolve) => {
        events.demoUploaded.pipe(take(1)).subscribe(({ gameId, demoUrl }) => {
          expect(gameId.equals(game._id)).toBe(true);
          expect(demoUrl).toEqual('https://demos.tf/427407');
          resolve();
        });
        gameLogs.next({
          payload:
            '06/19/2020 - 00:04:28: [demos.tf]: STV available at: https://demos.tf/427407',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('player connected', () =>
      new Promise<void>((resolve) => {
        events.playerJoinedGameServer
          .pipe(take(1))
          .subscribe(({ gameId, steamId, ipAddress }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(steamId).toEqual('76561198074409147');
            expect(ipAddress).toEqual('83.29.150.132');
            resolve();
          });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:03:44: "mały #tf2pickup.pl<366><[U:1:114143419]><>" connected, address "83.29.150.132:27005"',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('player joined team', () =>
      new Promise<void>((resolve) => {
        events.playerJoinedTeam
          .pipe(take(1))
          .subscribe(({ gameId, steamId }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(steamId).toEqual('76561198074409147');
            resolve();
          });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:03:51: "maly<366><[U:1:114143419]><Unassigned>" joined team "Blue"',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('player disconnected', () =>
      new Promise<void>((resolve) => {
        events.playerDisconnectedFromGameServer
          .pipe(take(1))
          .subscribe(({ gameId, steamId }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(steamId).toEqual('76561198074409147');
            resolve();
          });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:38:43: "maly<366><[U:1:114143419]><Blue>" disconnected (reason "Disconnect by user.")',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('score reported', () =>
      new Promise<void>((resolve) => {
        events.scoreReported
          .pipe(take(1))
          .subscribe(({ gameId, teamName, score }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(teamName).toEqual(Tf2Team.red);
            expect(score).toEqual(1);
            resolve();
          });
        gameLogs.next({
          payload:
            '06/27/2022 - 19:16:41: Team "Red" current score "1" with "6" players',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('final score reported', () =>
      new Promise<void>((resolve) => {
        events.scoreReported
          .pipe(take(1))
          .subscribe(({ gameId, teamName, score }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(teamName).toEqual(Tf2Team.blu);
            expect(score).toEqual(2);
            resolve();
          });
        gameLogs.next({
          payload:
            '01/26/2020 - 20:38:49: Team "Blue" final score "2" with "3" players',
          password: 'SOME_LOG_SECRET',
        });
      }));

    it('player said', () =>
      new Promise<void>((resolve) => {
        events.playerSaidInGameChat
          .pipe(take(1))
          .subscribe(({ gameId, steamId, message }) => {
            expect(gameId.equals(game._id)).toBe(true);
            expect(steamId).toEqual('76561198438053224');
            expect(message).toEqual(
              'mezzo : u never touched a female why are you taunting me',
            );
            resolve();
          });
        gameLogs.next({
          payload:
            '10/07/2022 - 19:49:18: "stick<40><[U:1:477787496]><Red>" say "mezzo : u never touched a female why are you taunting me"',
          password: 'SOME_LOG_SECRET',
        });
      }));
  });
});
