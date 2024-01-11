import { Test, TestingModule } from '@nestjs/testing';
import { AutoEndGamesService } from './auto-end-games.service';
import { GamesService } from '@/games/services/games.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  MongooseModule,
  getConnectionToken,
  getModelToken,
} from '@nestjs/mongoose';
import { Game, gameSchema } from '@/games/models/game';
import { Events } from '@/events/events';
import { ConfigurationService } from '@/configuration/services/configuration.service';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as GamesServiceMock } from '@/games/services/__mocks__/games.service';
import { Connection, Model, Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { Tf2Team } from '@/games/models/tf2-team';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { SlotStatus } from '@/games/models/slot-status';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { waitABit } from '@/utils/wait-a-bit';
import { GameState } from '@/games/models/game-state';
import { Mode } from 'fs';

jest.mock('@/games/services/games.service');
jest.mock('@/configuration/services/configuration.service');

describe('AutoEndGamesService', () => {
  let service: AutoEndGamesService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesServiceMock;
  let configurationService: jest.Mocked<ConfigurationService>;
  let mockGame: Game;
  let events: Events;
  let connection: Connection;
  let gameModel: Model<Game>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [
        AutoEndGamesService,
        GamesService,
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<AutoEndGamesService>(AutoEndGamesService);
    gamesService = module.get(GamesService);
    configurationService = module.get(ConfigurationService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
    gameModel = module.get(getModelToken(Game.name));

    mockGame = await gamesService._createOne();
  });

  beforeEach(() => {
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(
        {
          'games.auto_force_end_threshold': 4,
        }[key],
      ),
    );
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    await gamesService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a game has 3 subs', () => {
    let playerId: PlayerId;

    beforeEach(async () => {
      mockGame = await gamesService.update(mockGame._id, {
        slots: [
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.waitingForSubstitute,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.waitingForSubstitute,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.waitingForSubstitute,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
          {
            player: new Types.ObjectId() as PlayerId,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.soldier,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.connected,
            serialize: jest.fn(),
          },
        ],
      });

      playerId = mockGame.slots[3].player;
    });

    describe('and 4th player gets subbed', () => {
      beforeEach(async () => {
        await gameModel.findOneAndUpdate(
          mockGame._id,
          {
            'slots.$[element].status': SlotStatus.waitingForSubstitute,
          },
          {
            arrayFilters: [{ 'element.player': { $eq: playerId } }],
          },
        );
        events.substituteRequested.next({
          gameId: mockGame._id,
          playerId,
        });
        await waitABit(100);
      });

      it('should close the game', async () => {
        const game = await gamesService.getById(mockGame._id);
        // expect(game.state).toBe(GameState.interrupted);
        expect(gamesService.forceEnd).toHaveBeenCalledWith(game._id);
      });
    });
  });
});
