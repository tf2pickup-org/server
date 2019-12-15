import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from '../services/players.service';
import { Player } from '../models/player';

class PlayersServiceStub {
  player: Player = {
    _id: 'FAKE_ID',
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    hasAcceptedRules: true,
  };
  getAll() { return new Promise(resolve => resolve([ this.player ])); }
  getById(id: string) { return new Promise(resolve => resolve(this.player)); }
}

describe('Players Controller', () => {
  let controller: PlayersController;
  let playersService: PlayersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
      controllers: [PlayersController],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllPlayers()', () => {
    it('should return all players', async () => {
      const spy = spyOn(playersService, 'getAll').and.callThrough();
      const players = await controller.getAllPlayers();
      expect(spy).toHaveBeenCalled();
      expect(players).toEqual([ playersService.player ] as any[]);
    });
  });

  describe('#getPlayer()', () => {
    it('should return the player', async () => {
      const spy = spyOn(playersService, 'getById').and.callThrough();
      const ret = await controller.getPlayer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.player as any);
    });

    it('should return 404', async () => {
      spyOn(playersService, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(controller.getPlayer('FAKE_ID')).toBeRejectedWithError();
    });
  });
});
