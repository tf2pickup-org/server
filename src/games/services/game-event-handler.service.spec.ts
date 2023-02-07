import { Test, TestingModule } from '@nestjs/testing';
import { GameEventHandlerService } from './game-event-handler.service';
import { PlayersService } from '@/players/services/players.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Game, GameDocument, gameSchema } from '../models/game';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
import { Error, Types } from 'mongoose';
import { Mutex } from 'async-mutex';
import { Tf2Team } from '../models/tf2-team';
import { isUndefined } from 'lodash';
import { GameEventType } from '../models/game-event';
import { PlayerEventType } from '../models/player-event';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameId } from '../game-id';

jest.mock('@/players/services/players.service');
jest.mock('@nestjs/config');
jest.mock('./games.service');

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
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
        {
          provide: 'GAME_MODEL_MUTEX',
          useValue: new Mutex(),
        },
        GameEventHandlerService,
        PlayersService,
        GamesService,
        Events,
      ],
    }).compile();

    service = module.get<GameEventHandlerService>(GameEventHandlerService);
    playersService = module.get(PlayersService);
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
    beforeEach(async () => {
      mockGame.state = GameState.launching;
      await mockGame.save();
    });

    it('should update game state', async () => {
      const game = await service.onMatchStarted(mockGame.id);
      expect(game?.state).toEqual(GameState.started);
    });

    it('should reset game score', async () => {
      const game = await service.onMatchStarted(mockGame.id);
      expect(game?.score).toBeTruthy();
      expect(game?.score?.get(Tf2Team.blu)).toEqual(0);
      expect(game?.score?.get(Tf2Team.red)).toEqual(0);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => {
        event = game;
      });

      await service.onMatchStarted(mockGame.id);
      expect(event).toMatchObject({
        id: mockGame.id,
        state: GameState.started,
      });
    });

    describe('when the match has ended', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id).orFail();
        game.state = GameState.ended;
        await game.save();
      });

      it('should not update game state', async () => {
        await service.onMatchStarted(mockGame.id);
        const game = await gameModel.findById(mockGame.id).orFail();
        expect(game.state).toEqual(GameState.ended);
      });
    });
  });

  describe('#onMatchEnded()', () => {
    beforeEach(async () => {
      const game = await gameModel.findById(mockGame.id).orFail();
      game.state = GameState.started;
      await game.save();
    });

    it('should update state', async () => {
      const game = await service.onMatchEnded(mockGame.id);
      expect(game.state).toEqual(GameState.ended);
    });

    it('should push event', async () => {
      const game = await service.onMatchEnded(mockGame.id);
      expect(
        game.events.find((e) => e.event === GameEventType.Ended),
      ).toBeTruthy();
    });

    it('should emit the gameChanges events', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onMatchEnded(mockGame.id);
      expect(event).toMatchObject({ id: mockGame.id, state: GameState.ended });
    });

    describe('with player awaiting a substitute', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id).orFail();
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

        jest.useFakeTimers();
      });

      afterEach(() => jest.useRealTimers());

      it('should remove assigned game from medics immediately', async () => {
        const game = await service.onMatchEnded(mockGame.id);
        const players = await Promise.all(
          game.slots
            .filter((slot) => slot.gameClass === Tf2ClassName.medic)
            .map((slot) => slot.player)
            .map((playerId) => playersService.getById(playerId)),
        );
        expect(players.every((player) => isUndefined(player.activeGame))).toBe(
          true,
        );
      });

      it('should remove assigned game from all players after 5 seconds', async () => {
        const game = await service.onMatchEnded(mockGame.id);
        jest.advanceTimersByTime(5500);
        const players = await Promise.all(
          game.slots
            .map((slot) => slot.player)
            .map((playerId) => playersService.getById(playerId)),
        );
        expect(players.every((player) => isUndefined(player.activeGame))).toBe(
          true,
        );
      });
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      const game = await service.onLogsUploaded(mockGame._id, 'FAKE_LOGS_URL');
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit the gameChanges events', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onLogsUploaded(mockGame._id, 'FAKE_LOGS_URL');
      expect(event).toMatchObject({
        id: mockGame.id,
        logsUrl: 'FAKE_LOGS_URL',
      });
    });
  });

  describe('#onDemoUploaded()', () => {
    it('should update demoUrl', async () => {
      const game = await service.onDemoUploaded(mockGame._id, 'FAKE_DEMO_URL');
      expect(game.demoUrl).toEqual('FAKE_DEMO_URL');
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onDemoUploaded(mockGame._id, 'FAKE_DEMO_URL');
      expect(event).toMatchObject({
        id: mockGame.id,
        demoUrl: 'FAKE_DEMO_URL',
      });
    });

    describe('when a wrong gameId is captured', () => {
      it('should throw an error', async () => {
        await expect(
          service.onDemoUploaded(
            new Types.ObjectId() as GameId,
            'FAKE_DEMO_URL',
          ),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });
  });

  describe('#onPlayerJoining()', () => {
    it("should update the player's online state and push an event", async () => {
      const game = await service.onPlayerJoinedGameServer(
        mockGame.id,
        player1.steamId,
      );
      expect(game.findPlayerSlot(player1.id)?.connectionStatus).toEqual(
        PlayerConnectionStatus.joining,
      );
      const event = game
        .findPlayerSlot(player1.id)
        ?.events.find((e) => e.event === PlayerEventType.joinsGameServer);
      expect(event).toBeTruthy();
      expect(event?.at).toBeTruthy();
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onPlayerJoinedGameServer(mockGame.id, player1.steamId);
      expect(event).toMatchObject({ id: mockGame.id });
    });
  });

  describe('#onPlayerConnected()', () => {
    it("should update the player's online state and push an event", async () => {
      const game = await service.onPlayerJoinedTeam(
        mockGame.id,
        player1.steamId,
      );
      expect(game.findPlayerSlot(player1.id)?.connectionStatus).toEqual(
        PlayerConnectionStatus.connected,
      );
      const event = game
        .findPlayerSlot(player1.id)
        ?.events.find((e) => e.event === PlayerEventType.joinsGameServerTeam);
      expect(event).toBeTruthy();
      expect(event?.at).toBeTruthy();
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onPlayerJoinedTeam(mockGame.id, player1.steamId);
      expect(event).toMatchObject({ id: mockGame.id });
    });
  });

  describe('#onPlayerDisconnected()', () => {
    it("should update the player's online state and push an event", async () => {
      const game = await service.onPlayerDisconnected(
        mockGame.id,
        player1.steamId,
      );
      expect(game.findPlayerSlot(player1.id)?.connectionStatus).toEqual(
        PlayerConnectionStatus.offline,
      );
      const event = game
        .findPlayerSlot(player1.id)
        ?.events.find((e) => e.event === PlayerEventType.leavesGameServer);
      expect(event).toBeTruthy();
      expect(event?.at).toBeTruthy();
    });

    it('should emit an the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onPlayerDisconnected(mockGame.id, player1.steamId);
      expect(event).toMatchObject({ id: mockGame.id });
    });
  });

  describe('#onScoreReported()', () => {
    it("should update the game's score", async () => {
      let game = await service.onScoreReported(mockGame.id, Tf2Team.red, 2);
      expect(game.score?.get('red')).toEqual(2);

      game = await service.onScoreReported(mockGame.id, Tf2Team.blu, 5);
      expect(game.score?.get('blu')).toEqual(5);
    });

    it('should emit the gameChanges event', async () => {
      let event: Game | undefined;
      events.gameChanges.subscribe(({ newGame: game }) => (event = game));
      await service.onScoreReported(mockGame.id, Tf2Team.red, 2);
      expect(event).toMatchObject({ id: mockGame.id });
    });
  });
});
