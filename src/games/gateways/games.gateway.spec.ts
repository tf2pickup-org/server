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
  replacePlayer(gameId: string, replaceeId: string, replacementId: string) { return new Promise(resolve => resolve(game)); }
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

  describe('#replacePlayer()', () => {
    it('should replace the id', async () => {
      const spy = spyOn(gamesService, 'replacePlayer').and.callThrough();
      const ret = await gateway.replacePlayer({ request: { user: { id: 'FAKE_REPLACEMENT_ID' } } }, { gameId: 'FAKE_GAME_ID', replaceeId: 'FAKE_REPLACEE_ID' });
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', 'FAKE_REPLACEMENT_ID');
      expect(ret).toEqual(game as any);
    });
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
