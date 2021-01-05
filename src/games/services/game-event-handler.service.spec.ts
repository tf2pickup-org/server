import { Test, TestingModule } from '@nestjs/testing';
import { GameEventHandlerService } from './game-event-handler.service';
import { PlayersService } from '@/players/services/players.service';
import { GameRuntimeService } from './game-runtime.service';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { Game } from '../models/game';
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Player } from '@/players/models/player';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { serverCleanupDelay } from '@configs/game-servers';
import { GamesService } from './games.service';
import { Events } from '@/events/events';
import { standardSchemaOptions } from '@/utils/standard-schema-options';
import { removeGameAssignedSkills } from '@/utils/tojson-transform';

jest.mock('@/players/services/players.service');
jest.mock('@nestjs/config');
jest.mock('./game-runtime.service');
jest.mock('@/queue/gateways/queue.gateway');
jest.mock('./games.service');

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let gameRuntimeService: GameRuntimeService;
  let queueGateway: QueueGateway;
  let player1: DocumentType<Player>;
  let player2: DocumentType<Player>;
  let mockGame: DocumentType<Game>;
  let gameModel: ReturnModelType<typeof Game>;
  let gamesService: GamesService;
  let events: Events;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([standardSchemaOptions(Game, removeGameAssignedSkills), Player]),
      ],
      providers: [
        GameEventHandlerService,
        PlayersService,
        GameRuntimeService,
        QueueGateway,
        GamesService,
        Events,
      ],
    }).compile();

    service = module.get<GameEventHandlerService>(GameEventHandlerService);
    playersService = module.get(PlayersService);
    gameRuntimeService = module.get(GameRuntimeService);
    queueGateway = module.get(QueueGateway);
    gameModel = module.get(getModelToken(Game.name));
    gamesService = module.get(GamesService);
    events = module.get(Events);
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    // await gamesService.initialize();
    // @ts-expect-error
    mockGame = await gamesService._createOne([ player1, player2 ]);
  });

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onMatchStarted()', () => {
    it('should update game state', async () => {
      const game = await service.onMatchStarted(mockGame.id);
      expect(game.state).toEqual('started');
    });

    it('should emit the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) =>  {
        expect(game).toMatchObject({ id: mockGame.id, state: 'started' });
        resolve();
      });

      service.onMatchStarted(mockGame.id);
    }));

    describe('when the match has ended', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id);
        game.state = 'ended';
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
      game.state = 'started';
      await game.save();
    });

    it('should update state', async () => {
      const game = await service.onMatchEnded(mockGame.id);
      expect(game.state).toEqual('ended');
    });

    it('should eventually cleanup the server', async () => {
      jest.useFakeTimers();
      const spy = jest.spyOn(gameRuntimeService, 'cleanupServer');
      await service.onMatchEnded(mockGame.id);

      jest.advanceTimersByTime(serverCleanupDelay);
      expect(spy).toHaveBeenCalledWith(gameServerId.toString());
      jest.useRealTimers();
    });

    it('should emit the gameChanges events', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id, state: 'ended' });
        resolve();
      });

      service.onMatchEnded(mockGame.id);
    }));

    describe('with player awaiting a substitute', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(mockGame.id);
        game.slots[0].status = 'waiting for substitute';
        await game.save();
      });

      it('should set his status back to active', async () => {
        const game = await service.onMatchEnded(mockGame.id);
        expect(game.slots.every(s => s.status === 'active')).toBe(true);
      });

      it('should emit substitute requests change event over ws', async () => {
        const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
        await service.onMatchEnded(mockGame.id);
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      const game = await service.onLogsUploaded(mockGame._id, 'FAKE_LOGS_URL');
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit the gameChanges events', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id, logsUrl: 'FAKE_LOGS_URL' });
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

    it('should emit the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id, demoUrl: 'FAKE_DEMO_URL' });
        resolve();
      });

      service.onDemoUploaded(mockGame._id, 'FAKE_DEMO_URL');
    }));

    describe('when a wrong gameId is captured', () => {
      it('should return null', async () => {
        expect(await service.onDemoUploaded(new ObjectId().toString(), 'FAKE_DEMO_URL')).toBe(null);
      });
    });
  });

  describe('#onPlayerJoining()', () => {
    it('should update the player\'s online state', async () => {
      const game =  await service.onPlayerJoining(mockGame.id, player1.steamId);
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual('joining');
    });

    it('should emit the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id });
        resolve();
      });

      service.onPlayerJoining(mockGame.id, player1.steamId);
    }));
  });

  describe('#onPlayerConnected()', () => {
    it('should update the player\'s online state', async () => {
      const game = await service.onPlayerConnected(mockGame.id, player1.steamId);
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual('connected');
    });

    it('should emit the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id });
        resolve();
      });

      service.onPlayerConnected(mockGame.id, player1.steamId);
    }));
  });

  describe('#onPlayerDisconnected()', () => {
    it('should update the player\'s online state', async () => {
      const game = await service.onPlayerDisconnected(mockGame.id, player1.steamId);
      expect(game.findPlayerSlot(player1.id).connectionStatus).toEqual('offline');
    });

    it('should emit an the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id });
        resolve();
      });

      service.onPlayerDisconnected(mockGame.id, player1.steamId);
    }));
  });

  describe('#onScoreReported()', () => {
    it('should update the game\'s score', async () => {
      let game = await service.onScoreReported(mockGame.id, 'Red', '2');
      expect(game.score.get('red')).toEqual(2);

      game = await service.onScoreReported(mockGame.id, 'Blue', '5');
      expect(game.score.get('blu')).toEqual(5);
    });

    it('should emit the gameChanges event', async () => new Promise<void>(resolve => {
      events.gameChanges.subscribe(({ game }) => {
        expect(game).toMatchObject({ id: mockGame.id });
        resolve();
      });

      service.onScoreReported(mockGame.id, 'Red', '2');
    }));
  });
});
