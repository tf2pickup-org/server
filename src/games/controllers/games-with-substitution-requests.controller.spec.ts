import { Test, TestingModule } from '@nestjs/testing';
import { GamesWithSubstitutionRequestsController } from './games-with-substitution-requests.controller';
import { GamesService } from '../services/games.service';

const game = {
  id: 1,
  number: 2,
  map: 'cp_badlands',
};

class GamesServiceStub {
  getGamesWithSubstitutionRequests() {
    return [game];
  }
}

describe('GamesWithSubstitutionRequests Controller', () => {
  let controller: GamesWithSubstitutionRequestsController;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: GamesService, useClass: GamesServiceStub }],
      controllers: [GamesWithSubstitutionRequestsController],
    }).compile();

    controller = module.get<GamesWithSubstitutionRequestsController>(
      GamesWithSubstitutionRequestsController,
    );
    gamesService = module.get(GamesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGamesWithSubstitutionRequests()', () => {
    it('should relay on the service', async () => {
      const spy = jest.spyOn(gamesService, 'getGamesWithSubstitutionRequests');
      const ret = await controller.getGamesWithSubstitutionRequests();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual([game] as any);
    });
  });
});
