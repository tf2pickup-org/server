import { Test, TestingModule } from '@nestjs/testing';
import { RoundTrackerService } from './round-tracker.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Events } from '@/events/events';
import { Connection, Types } from 'mongoose';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Game, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as GamesServiceMock } from '@/games/services/__mocks__/games.service';
import { Tf2Team } from '@/games/models/tf2-team';
import { GameEventType } from '@/games/models/game-event-type';
import { RoundEnded } from '@/games/models/events/round-ended';
import { waitABit } from '@/utils/wait-a-bit';
import { GameId } from '@/games/game-id';

jest.mock('@/games/services/games.service');

describe('RoundTrackerService', () => {
  let service: RoundTrackerService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let events: Events;
  let gamesService: GamesServiceMock;
  let mockGame: Game;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [RoundTrackerService, Events, GamesService],
    }).compile();

    service = module.get<RoundTrackerService>(RoundTrackerService);
    events = module.get(Events);
    gamesService = module.get(GamesService);
    connection = module.get(getConnectionToken());

    mockGame = await gamesService._createOne();
  });

  beforeEach(() => service.onModuleInit());

  afterEach(async () => {
    await gamesService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when round ends', () => {
    beforeEach(async () => {
      events.roundWin.next({
        gameId: new Types.ObjectId(mockGame._id) as GameId,
        winner: Tf2Team.blu,
      });
      events.roundLength.next({
        gameId: new Types.ObjectId(mockGame._id) as GameId,
        lengthMs: 779340,
      });
      events.scoreReported.next({
        gameId: new Types.ObjectId(mockGame._id) as GameId,
        teamName: Tf2Team.red,
        score: 0,
      });
      events.scoreReported.next({
        gameId: new Types.ObjectId(mockGame._id) as GameId,
        teamName: Tf2Team.blu,
        score: 1,
      });

      await waitABit(1500);
    });

    it('should create RoundEnded event', async () => {
      const game = await gamesService.getById(mockGame._id);
      const event = game.events.find(
        ({ event }) => event === GameEventType.roundEnded,
      ) as RoundEnded;
      expect(event).toBeTruthy();
      expect(event.winner).toEqual(Tf2Team.blu);
      expect(event.lengthMs).toEqual(779340);

      expect(
        game.events.filter(({ event }) => event === GameEventType.roundEnded)
          .length,
      ).toEqual(1);
    });
  });
});
