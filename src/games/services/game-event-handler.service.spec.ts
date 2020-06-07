import { Test, TestingModule } from '@nestjs/testing';
import { GameEventHandlerService } from './game-event-handler.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { ConfigService } from '@nestjs/config';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { TypegooseModule, InjectModel, getModelToken } from 'nestjs-typegoose';
import { Game } from '../models/game';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Player } from '@/players/models/player';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/players/services/players.service');
jest.mock('./games.service');
jest.mock('@nestjs/config');
jest.mock('./game-runtime.service');
jest.mock('../gateways/games.gateway');
jest.mock('@/queue/gateways/queue.gateway');

class GamesServiceStub {
  mockGame: DocumentType<Game>;

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    private playersService: PlayersService,
  ) { }

  async initialize() {
    const players = await this.playersService.getAll();

    this.mockGame = await this.gameModel.create({
      number: 1,
      slots: [
        { player: players[0], team: 'blu', gameClass: 'scout' },
        { player: players[1], team: 'red', gameClass: 'scout' },
      ],
      players: players.map(p => p._id),
      map: 'cp_badlands',
    });
  }

  async getById(id: ObjectId) { return await this.gameModel.findById(id); }
}

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let mongod: MongoMemoryServer;
  let gameModel: ReturnModelType<typeof Game>;
  let playerModel: ReturnModelType<typeof Player>;
  let playersService: PlayersService;
  let gamesService: GamesServiceStub;
  let gameRuntimeService: GameRuntimeService;
  let gamesGateway: GamesGateway;
  let queueGateway: QueueGateway;
  let player1: DocumentType<Player>;
  let player2: DocumentType<Player>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Game, Player]),
      ],
      providers: [
        GameEventHandlerService,
        PlayersService,
        { provide: GamesService, useClass: GamesServiceStub },
        ConfigService,
        GameRuntimeService,
        GamesGateway,
        QueueGateway,
      ],
    }).compile();

    service = module.get<GameEventHandlerService>(GameEventHandlerService);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    gameRuntimeService = module.get(GameRuntimeService);
    gamesGateway = module.get(GamesGateway);
    gameModel = module.get(getModelToken('Game'));
    playerModel = module.get(getModelToken('Player'));
    queueGateway = module.get(QueueGateway);
  });

  beforeEach(async () => {
    // @ts-expect-error
    player1 = await playersService._createOne();
    // @ts-expect-error
    player2 = await playersService._createOne();
    await gamesService.initialize();
  });

  afterEach(async () => {
    await gameModel.deleteMany({ });
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onMatchStarted()', () => {
    it('should update game state', async () => {
      await service.onMatchStarted(gamesService.mockGame._id);
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.state).toEqual('started');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchStarted(gamesService.mockGame._id);
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });

    describe('when the game has already ended', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(gamesService.mockGame._id);
        game.state = 'ended';
        await game.save();
      });

      it('should not change the state', async () => {
        await service.onMatchStarted(gamesService.mockGame.id);
        const game = await gameModel.findById(gamesService.mockGame._id);
        expect(game.state).toEqual('ended');
      });
    });
  });

  describe('#onMatchEnded()', () => {
    let gameServerId: ObjectId;

    beforeEach(async () => {
      gameServerId = new ObjectId();
      const game = await gameModel.findById(gamesService.mockGame._id);
      game.gameServer = gameServerId;
      await game.save();
    });

    it('should update state', async () => {
      await service.onMatchEnded(gamesService.mockGame.id);
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.state).toEqual('ended');
    });

    it('should eventually cleanup the server', async done => {
      const spy = jest.spyOn(gameRuntimeService, 'cleanupServer');
      await service.onMatchEnded(gamesService.mockGame.id);
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith(gameServerId);
        done();
      }, 0);
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchEnded(gamesService.mockGame.id);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });

    describe('with player awaiting a substitute', () => {
      beforeEach(async () => {
        const game = await gameModel.findById(gamesService.mockGame._id);
        game.slots[0].status = 'waiting for substitute';
        await game.save();
      });

      it('should set his status back to active', async () => {
        await service.onMatchEnded(gamesService.mockGame.id);
        const game = await gameModel.findById(gamesService.mockGame._id);
        expect(game.slots.every(s => s.status === 'active')).toBe(true);
      });

      it('should emit subsitute requests change event over ws', async () => {
        const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
        await service.onMatchEnded(gamesService.mockGame._id);
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      await service.onLogsUploaded(gamesService.mockGame._id, 'FAKE_LOGS_URL');
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onLogsUploaded(gamesService.mockGame._id, 'FAKE_LOGS_URL');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerJoining()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerJoining(gamesService.mockGame.id, player1.steamId);
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.slots.find(s => player1._id.equals(s.player)).connectionStatus).toEqual('joining');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerJoining(gamesService.mockGame.id, player1.steamId);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerConnected()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerConnected(gamesService.mockGame.id, player1.steamId);
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.slots.find(s => player1._id.equals(s.player)).connectionStatus).toEqual('connected');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerConnected(gamesService.mockGame.id, player1.steamId);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerDisconnected()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerDisconnected(gamesService.mockGame.id, player1.steamId);
      const game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.slots.find(s => player1._id.equals(s.player)).connectionStatus).toEqual('offline');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerDisconnected(gamesService.mockGame.id, player1.steamId);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onScoreReported()', () => {
    it('should update the game\'s score', async () => {
      await service.onScoreReported(gamesService.mockGame.id, 'Red', '2');
      let game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.score.get('red')).toEqual(2);

      await service.onScoreReported(gamesService.mockGame.id, 'Blue', '5');
      game = await gameModel.findById(gamesService.mockGame._id);
      expect(game.score.get('blu')).toEqual(5);
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onScoreReported(gamesService.mockGame.id, 'Red', '2');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: gamesService.mockGame.id }));
    });
  });
});
