import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { Game } from '../models/game';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { NotFoundException } from '@nestjs/common';
import { Player } from '@/players/models/player';

jest.mock('../services/game-runtime.service');
jest.mock('../services/player-substitution.service');

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended', assignedSkills: new Map([['FAKE_PLAYER_ID', 1]]) } as Game,
    { number: 2, map: 'cp_fake_rc2', state: 'launching', assignedSkills: new Map([['FAKE_PLAYER_ID', 5]]) } as Game,
  ];
  getById(id: string) { return Promise.resolve(this.games[0]); }
  getGames(sort: any, limit: number, skip: number) { return Promise.resolve(this.games); }
  getGameCount() { return Promise.resolve(2); }
  getPlayerGames(playerId: string, sort: any, limit: number, skip: number) { return Promise.resolve(this.games); }
  getPlayerGameCount(playerId: string) { return Promise.resolve(1); }
}

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesServiceStub;
  let gameRuntimeService: GameRuntimeService;
  let playerSubstitutionService: PlayerSubstitutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
        GameRuntimeService,
        PlayerSubstitutionService,
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
    describe('when playerId is undefined', () => {
      describe('when sorting with -launched_at', () => {
        it('should return games', async () => {
          const spy = jest.spyOn(gamesService, 'getGames');
          const ret = await controller.getGames(10, 0, '-launched_at');
          expect(spy).toHaveBeenCalledWith({ launchedAt: -1 }, 10, 0);
          expect(ret).toEqual({
            results: gamesService.games,
            itemCount: 2,
          });
        });
      });

      describe('when sorting with launched_at', () => {
        it('should return games', async () => {
          const spy = jest.spyOn(gamesService, 'getGames');

          const ret = await controller.getGames(44, 52, 'launched_at');
          expect(spy).toHaveBeenCalledWith({ launchedAt: 1 }, 44, 52);
          expect(ret).toEqual({
            results: gamesService.games,
            itemCount: 2,
          });
        });
      });
    });

    describe('when playerId is specified', () => {
      describe('when sorting with -launched_at', () => {
        it('should return player games', async () => {
          const spy = jest.spyOn(gamesService, 'getPlayerGames');
          const ret = await controller.getGames(10, 0, '-launched_at', 'FAKE_PLAYER_ID');
          expect(spy).toHaveBeenCalledWith('FAKE_PLAYER_ID', { launchedAt: -1 }, 10, 0);
          expect(ret).toEqual({
            results: gamesService.games,
            itemCount: 1,
          });
        });
      });

      describe('when sorting with launched_at', () => {
        it('should return player games', async () => {
          const spy = jest.spyOn(gamesService, 'getPlayerGames');

          const ret = await controller.getGames(30, 2, 'launched_at', 'FAKE_PLAYER_ID');
          expect(spy).toHaveBeenCalledWith('FAKE_PLAYER_ID', { launchedAt: 1 }, 30, 2);
          expect(ret).toEqual({
            results: gamesService.games,
            itemCount: 1,
          });
        });
      });
    });
  });

  describe('#getGame()', () => {
    it('should return the given game', async () => {
      const ret = await controller.getGame('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0]);
    });

    describe('when requesting a non-existing game', () => {
      beforeEach(() => jest.spyOn(gamesService, 'getById').mockResolvedValue(null));

      it('should return 404', async () => {
        await expect(controller.getGame('FAKE_GAME_ID')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('#getGameSkills()', () => {
    it('should return given game assigned skills', async () => {
      const ret = await controller.getGameSkills('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0].assignedSkills);
    });

    describe('when requesting assigned skills for a non-existing game', () => {
      beforeEach(() => jest.spyOn(gamesService, 'getById').mockResolvedValue(null));

      it('should return 404', async () => {
        await expect(controller.getGameSkills('FAKE_GAME_ID')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('#takeAdminAction()', () => {
    it('should reinitialize server', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'reconfigure');
      await controller.takeAdminAction('FAKE_GAME_ID', '', undefined, undefined, undefined, { id: 'FAKE_ADMIN_ID' } as Player);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });

    it('should force end the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'forceEnd');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, '', undefined, undefined, { id: 'FAKE_ADMIN_ID' } as Player);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_ADMIN_ID');
    });

    it('should substitute player', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'substitutePlayer');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, undefined, 'FAKE_PLAYER_ID', undefined, { id: 'FAKE_ADMIN_ID' } as Player);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_PLAYER_ID');
    });

    it('should cancel substitution request', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'cancelSubstitutionRequest');
      await controller.takeAdminAction('FAKE_GAME_ID', undefined, undefined, undefined, 'FAKE_PLAYER_ID', { id: 'FAKE_ADMIN_ID' } as Player);
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_PLAYER_ID');
    });
  });
});
