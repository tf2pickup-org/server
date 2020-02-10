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

class PlayersServiceStub {
  playerIds: ObjectId[] = [];

  constructor(
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Game>,
  ) { }

  async initialize() {
    this.playerIds.push((await this.playerModel.create({
      name: 'FAKE_PLAYER_1',
      steamId: 'FAKE_STEAM_ID_1',
    })).id);
    this.playerIds.push((await this.playerModel.create({
      name: 'FAKE_PLAYER_2',
      steamId: 'FAKE_STEAM_ID_2',
    })).id);
  }

  async findBySteamId(steamId: string) { return this.playerModel.findOne({ steamId }); }
}

class GamesServiceStub {
  mockGame: DocumentType<Game>;

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    private playersService: PlayersService,
  ) { }

  async initialize() {
    this.mockGame = await this.gameModel.create({
      number: 1,
      teams: {
        1: 'RED',
        2: 'BLU',
      },
      slots: [
        { playerId: (this.playersService as unknown as PlayersServiceStub).playerIds[0], teamId: 1, gameClass: 'scout' },
        { playerId: (this.playersService as unknown as PlayersServiceStub).playerIds[1], teamId: 2, gameClass: 'scout' },
      ],
      players: (this.playersService as unknown as PlayersServiceStub).playerIds,
      map: 'cp_badlands',
    });
  }

  async getById(id: string) { return await this.gameModel.findById(id); }
}

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      case 'serverCleanupDelay':
        return 1000;
    }
  }
}

class GameRuntimeServiceStub {
  cleanupServer(gameId: any) { return null; }
}

class GamesGatewayStub {
  emitGameUpdated(game: any) { return null; }
}

class QueueGatewayStub {
  updateSubstituteRequests() { }
}

jest.useFakeTimers();

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let playersService: PlayersServiceStub;
  let gamesService: GamesServiceStub;
  let gameRuntimeService: GameRuntimeServiceStub;
  let gamesGateway: GamesGatewayStub;
  let gameModel: ReturnModelType<typeof Game>;
  let playerModel: ReturnModelType<typeof Player>;
  let queueGateway: QueueGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(),
        TypegooseModule.forFeature([Game, Player]),
      ],
      providers: [
        GameEventHandlerService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: GameRuntimeService, useClass: GameRuntimeServiceStub },
        { provide: GamesGateway, useClass: GamesGatewayStub },
        { provide: QueueGateway, useClass: QueueGatewayStub },
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
    await playersService.initialize();
    await gamesService.initialize();
  });

  afterEach(async () => {
    await gameModel.deleteMany({ });
    await playerModel.deleteMany({ });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onMatchStarted()', () => {
    it('should update game state', async () => {
      await service.onMatchStarted(gamesService.mockGame.id);
      const game = await gameModel.findOne();
      expect(game.state).toEqual('started');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchStarted(gamesService.mockGame.id);
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onMatchEnded()', () => {
    let gameServerId: ObjectId;

    beforeEach(async () => {
      gameServerId = new ObjectId();
      const game = await gameModel.findOne();
      game.gameServer = gameServerId;
      await game.save();
    });

    it('should update state', async () => {
      await service.onMatchEnded(gamesService.mockGame.id);
      const game = await gameModel.findOne();
      expect(game.state).toEqual('ended');
    });

    it('should eventually cleanup the server', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'cleanupServer');
      await service.onMatchEnded(gamesService.mockGame.id);
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledWith(gameServerId.toString());
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchEnded(gamesService.mockGame.id);
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });

    describe('with player awaiting a substitute', () => {
      beforeEach(async () => {
        const game = await gameModel.findOne();
        game.slots[0].status = 'waiting for substitute';
        await game.save();
      });

      it('should set his status back to active', async () => {
        await service.onMatchEnded(gamesService.mockGame.id);
        const game = await gameModel.findOne();
        expect(game.slots.every(s => s.status === 'active')).toBe(true);
      });

      it('should emit subsitute requests change event over ws', async () => {
        const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
        await service.onMatchEnded(gamesService.mockGame.id);
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      await service.onLogsUploaded(gamesService.mockGame.id, 'FAKE_LOGS_URL');
      const game = await gameModel.findOne();
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onLogsUploaded(gamesService.mockGame.id, 'FAKE_LOGS_URL');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerJoining()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerJoining(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      const game = await gameModel.findOne();
      expect(game.slots.find(s => s.playerId === playersService.playerIds[0].toString()).connectionStatus).toEqual('joining');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerJoining(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerConnected()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerConnected(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      const game = await gameModel.findOne();
      expect(game.slots.find(s => s.playerId === playersService.playerIds[0].toString()).connectionStatus).toEqual('connected');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerConnected(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onPlayerDisconnected()', () => {
    it('should update the player\'s online state', async () => {
      await service.onPlayerDisconnected(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      const game = await gameModel.findOne();
      expect(game.slots.find(s => s.playerId === playersService.playerIds[0].toString()).connectionStatus).toEqual('offline');
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onPlayerDisconnected(gamesService.mockGame.id, 'FAKE_STEAM_ID_1');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });

  describe('#onScoreReported()', () => {
    it('should update the game\'s score', async () => {
      await service.onScoreReported(gamesService.mockGame.id, 'Red', '2');
      let game = await gameModel.findOne();
      expect(game.score.get('1')).toEqual(2);

      await service.onScoreReported(gamesService.mockGame.id, 'Blue', '5');
      game = await gameModel.findOne();
      expect(game.score.get('2')).toEqual(5);
    });

    it('should emit an event over ws', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      await service.onScoreReported(gamesService.mockGame.id, 'Red', '2');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: gamesService.mockGame.id }));
    });
  });
});
