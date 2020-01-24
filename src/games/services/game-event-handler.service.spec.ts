import { Test, TestingModule } from '@nestjs/testing';
import { GameEventHandlerService } from './game-event-handler.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { ConfigService } from '@nestjs/config';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';

const mockGame = {
  id: 'FAKE_GAME_ID',
  number: 2,
  state: 'launching',
  gameServer: 'FAKE_GAME_SERVER_ID',
  logsUrl: null,
  save: () => null,
};

class GamesServiceStub {
  getById() { return new Promise(resolve => resolve(mockGame)); }
}

class PlayersServiceStub { }

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      case 'serverCleanupDelay':
        return 1000;
    }
  }
}

class GameRuntimeServiceStub {
  cleanupServer(gameId: string) { return null; }
}

class GamesGatewayStub {
  emitGameUpdated(game: any) { return null; }
}

describe('GameEventHandlerService', () => {
  let service: GameEventHandlerService;
  let gamesService: GamesServiceStub;
  let gameRuntimeService: GameRuntimeServiceStub;
  let gamesGateway: GamesGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEventHandlerService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: GameRuntimeService, useClass: GameRuntimeServiceStub },
        { provide: GamesGateway, useClass: GamesGatewayStub },
      ],
    }).compile();

    service = module.get<GameEventHandlerService>(GameEventHandlerService);
    gamesService = module.get(GamesService);
    gameRuntimeService = module.get(GameRuntimeService);
    gamesGateway = module.get(GamesGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onMatchStarted()', () => {
    it('should update game state', async () => {
      const game = { ...mockGame };
      spyOn(gamesService, 'getById').and.returnValue(game as any);
      await service.onMatchStarted('FAKE_GAME_ID');
      expect(game.state).toEqual('started');
    });

    it('should emit an event over ws', async () => {
      const spy = spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchStarted('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'FAKE_GAME_ID' }));
    });
  });

  describe('#onMatchEnded()', () => {
    it('should update state', async () => {
      const game = { ...mockGame };
      spyOn(gamesService, 'getById').and.returnValue(game as any);
      await service.onMatchEnded('FAKE_GAME_ID');
      expect(game.state).toEqual('ended');
    });

    it('should eventually cleanup the server', async () => {
      jasmine.clock().install();
      const spy = spyOn(gameRuntimeService, 'cleanupServer');
      await service.onMatchEnded('FAKE_GAME_ID');
      jasmine.clock().tick(1001);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
      jasmine.clock().uninstall();
    });

    it('should emit an event over ws', async () => {
      const spy = spyOn(gamesGateway, 'emitGameUpdated');
      await service.onMatchEnded('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'FAKE_GAME_ID' }));
    });
  });

  describe('#onLogsUploaded()', () => {
    it('should update logsUrl', async () => {
      const game = { ...mockGame };
      spyOn(gamesService, 'getById').and.returnValue(game as any);
      await service.onLogsUploaded('FAKE_GAME_ID', 'FAKE_LOGS_URL');
      expect(game.logsUrl).toEqual('FAKE_LOGS_URL');
    });

    it('should emit an event over ws', async () => {
      const spy = spyOn(gamesGateway, 'emitGameUpdated');
      await service.onLogsUploaded('FAKE_GAME_ID', 'FAKE_LOGS_URL');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'FAKE_GAME_ID' }));
    });
  });
});
