import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { Game } from '../models/game';

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended' },
    { number: 2, map: 'cp_fake_rc2', state: 'launching' },
  ];
  getGames(sort: any, limit: number, skip: number) { return new Promise(resolve => resolve(this.games)); }
  getGameCount() { return new Promise(resolve => resolve(2)); }
  getById(id: string) { return new Promise(resolve => resolve(this.games[0])); }
}

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
      ],
      controllers: [GamesController],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    gamesService = module.get(GamesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGames()', () => {
    it('should return games', async () => {
      const spy1 = spyOn(gamesService, 'getGames').and.callThrough();
      const spy2 = spyOn(gamesService, 'getGameCount').and.callThrough();

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
      const spy = spyOn(gamesService, 'getById').and.callThrough();
      const ret = await controller.getGame('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0] as any);
    });
  });
});
