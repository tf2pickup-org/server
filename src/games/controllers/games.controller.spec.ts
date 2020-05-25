import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { ObjectId } from 'mongodb';

jest.mock('../services/game-runtime.service');
jest.mock('../services/player-substitution.service');
jest.mock('../services/games.service');

const mockGame = { id: new ObjectId(), number: 1, map: 'cp_fake_rc1', state: 'ended', assignedSkills: new Map([['FAKE_PLAYER_ID', 1]]) };

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesService;
  let gameRuntimeService: GameRuntimeService;
  let playerSubstitutionService: PlayerSubstitutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
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

  beforeEach(() => {
    gamesService.getGames = () => Promise.resolve([ mockGame ] as any);
    gamesService.getById = () => Promise.resolve(mockGame as any);
    gamesService.getGameCount = () => Promise.resolve(1);
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
        results: [ mockGame ],
        itemCount: 1,
      } as any);
    });
  });

  describe('#getGame()', () => {
    it('should return the given game', async () => {
      const ret = await controller.getGame(mockGame.id);
      expect(ret).toEqual(mockGame);
    });
  });

  describe('#getGameSkills()', () => {
    it('should return given game assigned skills', async () => {
      const ret = await controller.getGameSkills(mockGame.id);
      expect(ret).toEqual(mockGame.assignedSkills);
    });
  });

  describe('#takeAdminAction()', () => {
    let playerId: ObjectId;

    beforeEach(() => playerId = new ObjectId());

    it('should reinitialize server', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'reconfigure');
      await controller.takeAdminAction(mockGame.id, '', undefined, undefined, undefined);
      expect(spy).toHaveBeenCalledWith(mockGame.id);
    });

    it('should force end the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'forceEnd');
      await controller.takeAdminAction(mockGame.id, undefined, '', undefined, undefined);
      expect(spy).toHaveBeenCalledWith(mockGame.id);
    });

    it('should substitute player', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'substitutePlayer');
      await controller.takeAdminAction(mockGame.id, undefined, undefined, playerId.toString(), undefined);
      expect(spy).toHaveBeenCalledWith(mockGame.id, playerId);
    });

    it('should cancel substitution request', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'cancelSubstitutionRequest');
      await controller.takeAdminAction(mockGame.id, undefined, undefined, undefined, playerId.toString());
      expect(spy).toHaveBeenCalledWith(mockGame.id, playerId);
    });
  });
});
