import { Test, TestingModule } from '@nestjs/testing';
import { HallOfFameController } from './hall-of-fame.controller';
import { GamesService } from '@/games/services/games.service';

class GamesServiceStub {
  getMostActivePlayers() { return [ ]; }
  getMostActiveMedics() { return [ ]; }
}

describe('HallOfFame Controller', () => {
  let controller: HallOfFameController;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HallOfFameController],
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
      ],
    }).compile();

    controller = module.get<HallOfFameController>(HallOfFameController);
    gamesService = module.get(GamesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getHallOfFame()', () => {
    it('should query games service', async () => {
      const spy1 = jest.spyOn(gamesService, 'getMostActivePlayers');
      const spy2 = jest.spyOn(gamesService, 'getMostActiveMedics');
      await controller.getHallOfFame();
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });
});
