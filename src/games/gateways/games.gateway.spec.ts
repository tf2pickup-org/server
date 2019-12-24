import { Test, TestingModule } from '@nestjs/testing';
import { GamesGateway } from './games.gateway';
import { GamesService } from '../services/games.service';
import { Subject } from 'rxjs';

const game = {
  id: 'FAKE_GAME_ID',
  state: 'launching',
};

class GamesServiceStub {
  gameCreated = new Subject<any>();
  gameUpdated = new Subject<any>();
}

describe('GamesGateway', () => {
  let gateway: GamesGateway;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesGateway,
        { provide: GamesService, useClass: GamesServiceStub },
      ],
    }).compile();

    gateway = module.get<GamesGateway>(GamesGateway);
    gamesService = module.get(GamesService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#afterInit()', () => {
    const socket = {
      emit: (...args: any[]) => null,
    };

    beforeEach(() => gateway.afterInit(socket as any));

    it('should pass all the events over websockets', () => {
      const spy = spyOn(socket, 'emit').and.callThrough();

      gamesService.gameCreated.next(game);
      expect(spy).toHaveBeenCalledWith('game created', game);

      gamesService.gameUpdated.next(game);
      expect(spy).toHaveBeenCalledWith('game updated', game);
    });
  });
});
