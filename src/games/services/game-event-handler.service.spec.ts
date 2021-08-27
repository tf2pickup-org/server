import { Test, TestingModule } from '@nestjs/testing';
import { GameEventHandlerService } from './game-event-handler.service';
import { PlayersService } from '@/players/services/players.service';
import { GameRuntimeService } from './game-runtime.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { ObjectId } from 'mongodb';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { serverCleanupDelay } from '@configs/game-servers';
import { GamesService } from './games.service';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

jest.mock('@/players/services/players.service');
jest.mock('@nestjs/config');
jest.mock('./game-runtime.service');
jest.mock('./games.service');

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let gameRuntimeService: GameRuntimeService;
  let player1: PlayerDocument;
  let player2: PlayerDocument;
  let mockGame: GameDocument;
  let gameModel: Model<GameDocument>;
  let gamesService: GamesService;
  let events: Events;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        GameEventHandlerService,
        PlayersService,
        GameRuntimeService,
        GamesService,
        Events,
      ],
    }).compile();

    service = module.get<GameEventHandlerService>(GameEventHandlerService);
    playersService = module.get(PlayersService);
    gameRuntimeService = module.get(GameRuntimeService);
    gameModel = module.get(getModelToken(Game.name));
    gamesService = module.get(GamesService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    // await gamesService.initialize();
    // @ts-expect-error
    mockGame = await gamesService._createOne([player1, player2]);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onMatchStarted()', () => {
    it('should update game state', async () => {
      const game = await service.onMatchStarted(mockGame.id);
      expect(game.state).toEqual('started');
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id, state: 'started' });
          resolve();
        });

        service.onMatchStarted(mockGame.id);
      }));

    describe('when the match has ended', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id);
        game.state = GameState.ended;
        await game.save();
      });

      it('should not update game state', async () => {
        await service.onMatchStarted(mockGame.id);
        const game = await gameModel.findById(mockGame.id);
        expect(game.state).toEqual('ended');
      });
    });
  });

  describe('#onMatchEnded()', () => {
    let gameServerId: ObjectId;

    beforeEach(async () => {
      gameServerId = new ObjectId();
      const game = await gameModel.findById(mockGame.id);
      game.gameServer = gameServerId;
      game.state = GameState.started;
      await game.save();
    });

    it('should update state', async () => {
      const game = await service.onMatchEnded(mockGame.id);
      expect(game.state).toEqual('ended');
    });

    it('should eventually cleanup the server', async () => {
      jest.useFakeTimers('legacy');
      const spy = jest.spyOn(gameRuntimeService, 'cleanupServer');
      await service.onMatchEnded(mockGame.id);

      jest.advanceTimersByTime(serverCleanupDelay);
      expect(spy).toHaveBeenCalledWith(gameServerId.toString());
      jest.useRealTimers();
    });

    it('should emit the gameChanges events', async () => {
      let event: Game;
      events.gameChanges.subscribe(({ game }) => {
        event = game;
      });

      await service.onMatchEnded(mockGame.id);
      expect(event).toMatchObject({ id: mockGame.id, state: 'ended' });
    });

    describe('with player awaiting a substitute', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id);
        game.slots[0].status = SlotStatus.waitingForSubstitute;
        await game.save();
      });

      it('should set his status back to active', async () => {
        const game = await service.onMatchEnded(mockGame.id);
        expect(game.slots.every((s) => s.status === SlotStatus.active)).toBe(
          true,
        );
      });

      it('should emit the substituteRequestsChange event', async () => {
        let eventEmitted = false;
        events.substituteRequestsChange.subscribe(() => {
          eventEmitted = true;
        });
        await service.onMatchEnded(mockGame.id);
        expect(eventEmitted).toBe(true);
      });
    });

    describe('when there are medics in the game', () => {
      beforeEach(async () => {
        mockGame.slots[0].gameClass = Tf2ClassName.medic;
        await mockGame.save();
      });

      it('should remove assigned game from medics immediately', async () => {
        const game = await service.onMatchEnded(mockGame.id);
        const players = await Promise.all(
          game.slots
            .filter((slot) => slot.gameClass === Tf2ClassName.medic)
            .map((slot) => slot.player)
            .map((playerId) => playersService.getById(playerId.toString())),
        );
        expect(players.every((player) => player.activeGame === undefined)).toBe(
          true,
        );
      });

      it('should remove assigned game from all players after 5 seconds', async () => {
        jest.useFakeTimers('legacy');
        const game = await service.onMatchEnded(mockGame.id);
        jest.advanceTimersByTime(5000);
        const players = await Promise.all(
          game.slots
            .map((slot) => slot.player)
            .map((playerId) => playersService.getById(playerId.toString())),
        );
        expect(players.every((player) => player.activeGame === undefined)).toBe(
          true,
        );
        jest.useRealTimers();
      });
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      const game = await service.onLogsUploaded(mockGame._id, 'FAKE_LOGS_URL');
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit the gameChanges events', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({
            id: mockGame.id,
            logsUrl: 'FAKE_LOGS_URL',
          });
          resolve();
        });

        service.onLogsUploaded(mockGame._id, 'FAKE_LOGS_URL');
      }));
  });

  describe('#onDemoUploaded()', () => {
    it('should update demoUrl', async () => {
      const game = await service.onDemoUploaded(mockGame._id, 'FAKE_DEMO_URL');
      expect(game.demoUrl).toEqual('FAKE_DEMO_URL');
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({
            id: mockGame.id,
            demoUrl: 'FAKE_DEMO_URL',
          });
          resolve();
        });

        service.onDemoUploaded(mockGame._id, 'FAKE_DEMO_URL');
      }));

    describe('when a wrong gameId is captured', () => {
      it('should return null', async () => {
        expect(
          await service.onDemoUploaded(
            new ObjectId().toString(),
            'FAKE_DEMO_URL',
          ),
        ).toBe(null);
      });
    });
  });

  describe('#onPlayerJoining()', () => {
    it("should update the player's online state", async () => {
      const game = await service.onPlayerJoining(mockGame.id, player1.steamId);
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual(
        'joining',
      );
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.onPlayerJoining(mockGame.id, player1.steamId);
      }));
  });

  describe('#onPlayerConnected()', () => {
    it("should update the player's online state", async () => {
      const game = await service.onPlayerConnected(
        mockGame.id,
        player1.steamId,
      );
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual(
        'connected',
      );
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.onPlayerConnected(mockGame.id, player1.steamId);
      }));
  });

  describe('#onPlayerDisconnected()', () => {
    it("should update the player's online state", async () => {
      const game = await service.onPlayerDisconnected(
        mockGame.id,
        player1.steamId,
      );
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual(
        'offline',
      );
    });

    it('should emit an the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.onPlayerDisconnected(mockGame.id, player1.steamId);
      }));
  });

  describe('#onScoreReported()', () => {
    it("should update the game's score", async () => {
      let game = await service.onScoreReported(mockGame.id, 'Red', '2');
      expect(game.score.get('red')).toEqual(2);

      game = await service.onScoreReported(mockGame.id, 'Blue', '5');
      expect(game.score.get('blu')).toEqual(5);
    });

    it('should emit the gameChanges event', async () =>
      new Promise<void>((resolve) => {
        events.gameChanges.subscribe(({ game }) => {
          expect(game).toMatchObject({ id: mockGame.id });
          resolve();
        });

        service.onScoreReported(mockGame.id, 'Red', '2');
      }));
  });
});
