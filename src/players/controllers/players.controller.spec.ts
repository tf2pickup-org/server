import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from '../services/players.service';
import { Player } from '../models/player';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { PlayerStats } from '../models/player-stats';

class PlayersServiceStub {
  player: Player = {
    _id: 'FAKE_ID',
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    hasAcceptedRules: true,
  };
  stats: PlayerStats = {
    player: 'FAKE_ID',
    gamesPlayed: 220,
    classesPlayed: {
      scout: 19,
      soldier: 102,
      demoman: 0,
      medic: 92,
    },
  };
  getAll() { return new Promise(resolve => resolve([ this.player ])); }
  getById(id: string) { return new Promise(resolve => resolve(this.player)); }
  updatePlayer(playerId: string, update: Partial<Player>) { return new Promise(resolve => resolve(this.player)); }
  getPlayerStats(playerId: string) { return new Promise(resolve => resolve(this.stats)); }
}

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended' },
    { number: 2, map: 'cp_fake_rc2', state: 'launching' },
  ];
  getPlayerGames(playerId: string, sort: any = { launchedAt: -1 }, limit: number = 10, skip: number = 0) {
    return new Promise(resolve => resolve(this.games));
  }
  getPlayerGameCount() { return new Promise(resolve => resolve(2)); }
}

describe('Players Controller', () => {
  let controller: PlayersController;
  let playersService: PlayersServiceStub;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
      ],
      controllers: [PlayersController],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
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

  describe('#updatePlayer()', () => {
    it('should update the player', async () => {
      const spy = spyOn(playersService, 'updatePlayer').and.callThrough();
      const ret = await controller.updatePlayer('FAKE_ID', { name: 'FAKE_NEW_NAME' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID', { name: 'FAKE_NEW_NAME' });
      expect(ret).toEqual(playersService.player as any);
    });
  });

  describe('#getPlayerGames()', () => {
    it('should return player games', async () => {
      const spy1 = spyOn(gamesService, 'getPlayerGames').and.callThrough();
      const spy2 = spyOn(gamesService, 'getPlayerGameCount').and.callThrough();

      const ret = await controller.getPlayerGames('FAKE_ID', 44, 52, 'launched_at');
      expect(spy1).toHaveBeenCalledWith('FAKE_ID', { launchedAt: 1 }, 44, 52);
      expect(spy2).toHaveBeenCalled();
      expect(ret).toEqual({
        results: gamesService.games,
        itemCount: 2,
      } as any);
    });

    it('should throw an error unless the sort param is correct', async () => {
      await expectAsync(controller.getPlayerGames('FAKE_ID', 3, 5, 'lol')).toBeRejectedWithError();
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return player stats', async () => {
      const spy = spyOn(playersService, 'getPlayerStats').and.callThrough();
      const ret = await controller.getPlayerStats('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.stats);
    });
  });
});
