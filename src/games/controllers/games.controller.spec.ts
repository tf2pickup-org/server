import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { Game } from '../models/game';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended', assignedSkills: new Map([['FAKE_PLAYER_ID', 1]]) },
    { number: 2, map: 'cp_fake_rc2', state: 'launching', assignedSkills: new Map([['FAKE_PLAYER_ID', 5]]) },
  ];
  getGames(sort: any, limit: number, skip: number) { return new Promise(resolve => resolve(this.games)); }
  getGameCount() { return new Promise(resolve => resolve(2)); }
  getById(id: string) { return new Promise(resolve => resolve(this.games[0])); }
}

class GameRuntimeServiceStub {
  reconfigure(gameId: string) { return new Promise(resolve => resolve()); }
  forceEnd(gameId: string) { return new Promise(resolve => resolve()); }
}

class PlayerSubstitutionServiceStub {
  substitutePlayer(gameId: string, playerId: string) { return new Promise(resolve => resolve()); }
  cancelSubstitutionRequest(gameId: string, playerId: string) { return new Promise(resolve => resolve()); }
}

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesServiceStub;
  let gameRuntimeService: GameRuntimeServiceStub;
  let playerSubstitutionService: PlayerSubstitutionServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: GameRuntimeService, useClass: GameRuntimeServiceStub },
        { provide: PlayerSubstitutionService, useClass: PlayerSubstitutionServiceStub },
      ],
      controllers: [GamesController],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    gamesService = module.get(GamesService);
    gameRuntimeService = module.get(GameRuntimeService);
    playerSubstitutionService = module.get(PlayerSubstitutionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGames()', () => {
    it('should return games', async () => {
      const spy1 = jest.spyOn(gamesService, 'getGames');
      const spy2 = jest.spyOn(gamesService, 'getGameCount');

      const ret = await controller.getGames(44, 52, 'launched_at');
      expect(spy1).toHaveBeenCalledWith({ launchedAt: 1 }, 44, 52);
      expect(spy2).toHaveBeenCalled();
      expect(ret).toEqual({
        results: gamesService.games,
        itemCount: 2,
      } as any);
    });
  });

  describe('#getGame()', () => {
    it('should return the given game', async () => {
      const spy = jest.spyOn(gamesService, 'getById');
      const ret = await controller.getGame('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0] as any);
    });
  });

  describe('#getGameSkills()', () => {
    it('should return given game assigned skills', async () => {
      const spy = jest.spyOn(gamesService, 'getById');
      const ret = await controller.getGameSkills('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0].assignedSkills);
    });
  });

  describe('#takeAdminAction()', () => {
    it('should reinitialize server', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'reconfigure');
      await controller.takeAdminAction('FAKE_GAME_ID', '', undefined, undefined, undefined);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });

    it('should force end the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'forceEnd');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, '', undefined, undefined);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });

    it('should substitute player', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'substitutePlayer');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, undefined, 'FAKE_PLAYER_ID', undefined);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_PLAYER_ID');
    });

    it('should cancel substitution request', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'cancelSubstitutionRequest');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, undefined, undefined, 'FAKE_PLAYER_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_PLAYER_ID');
    });
  });
});
