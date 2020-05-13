import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubstitutionService } from './player-substitution.service';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { SubstituteRequest } from '@/queue/substitute-request';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { cloneDeep } from 'lodash';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { QueueService } from '@/queue/services/queue.service';

// fixme: use TestingMongooseModule here

const mockGame = {
  id: 'FAKE_GAME_ID',
  number: 1,
  players: [ 'FAKE_PLAYER_1', 'FAKE_PLAYER_2' ],
  slots: [
    {
      playerId: 'FAKE_PLAYER_1',
      teamId: '0',
      gameClass: 'soldier',
      status: 'active',
    },
    {
      playerId: 'FAKE_PLAYER_2',
      teamId: '1',
      gameClass: 'soldier',
      status: 'active',
    },
  ],
  map: 'cp_badlands',
  state: 'launching',
  teams: new Map([['0', 'RED'], ['1', 'BLU']]),
  gameServer: 'FAKE_GAME_SERVER_ID',
  save: () => null,
};

class GamesServiceStub {
  game = cloneDeep(mockGame);
  getById(id: string) {
    return new Promise(resolve => {
      if (id === 'FAKE_GAME_ID') {
        return resolve(this.game);
      } else {
        return resolve(null);
      }
    });
  }
  getPlayerActiveGame(playerId: string) { return new Promise(resolve => resolve(null)); }
}

class PlayersServiceStub {
  players = new Map<string, any>([
    [ 'FAKE_PLAYER_1', { id: 'FAKE_PLAYER_1', name: 'PLAYER_1' } ],
    [ 'FAKE_PLAYER_2', { id: 'FAKE_PLAYER_2', name: 'PLAYER_2' } ],
    [ 'FAKE_PLAYER_3', { id: 'FAKE_PLAYER_3', name: 'PLAYER_3' } ],
  ]);

  getById(id: string) {
    return new Promise(resolve => {
      const player = this.players.get(id);
      if (player) {
        resolve({ ...player });
      } else {
        resolve(null);
      }
    });
  }
}

class PlayerBansServiceStub {
  getPlayerActiveBans(playerId: string) { return []; }
}

class GameRuntimeServiceStub {
  replacePlayer(gameId: string, replaceeId: string, replacementSlot: any) { return null; }
  sayChat(gameServerId: string, message: string) { return null; }
}

class GamesGatewayStub {
  emitGameUpdated(game: any) { return null; }
}

class DiscordNotificationsServiceStub {
  notifySubstituteRequest(substituteRequest: SubstituteRequest) { return null; }
}

class QueueGatewayStub {
  updateSubstituteRequests() { return null; }
}

class QueueServiceStub {
  kick(...playerIds: string[]) { return null; }
}

describe('PlayerSubstitutionService', () => {
  let service: PlayerSubstitutionService;
  let gamesService: GamesServiceStub;
  let playersService: PlayersServiceStub;
  let playerBansService: PlayerBansServiceStub;
  let gameRuntimeService: GameRuntimeServiceStub;
  let gamesGateway: GamesGatewayStub;
  let discordNotificationsService: DiscordNotificationsServiceStub;
  let queueGateway: QueueGatewayStub;
  let queueService: QueueServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSubstitutionService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        { provide: GameRuntimeService, useClass: GameRuntimeServiceStub },
        { provide: GamesGateway, useClass: GamesGatewayStub },
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
        { provide: QueueGateway, useClass: QueueGatewayStub },
        { provide: QueueService, useClass: QueueServiceStub },
      ],
    }).compile();

    service = module.get<PlayerSubstitutionService>(PlayerSubstitutionService);
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    gameRuntimeService = module.get(GameRuntimeService);
    gamesGateway = module.get(GamesGateway);
    discordNotificationsService = module.get(DiscordNotificationsService);
    queueGateway = module.get(QueueGateway);
    queueService = module.get(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#substitutePlayer()', () => {
    it('should throw an error if the given game doesn\'t exist', async () => {
      await expect(service.substitutePlayer('wahtever', 'FAKE_PLAYER_1')).rejects.toThrowError('no such game');
    });

    it('should throw an error if the given player does not exist', async () => {
      jest.spyOn(playersService, 'getById').mockResolvedValue(null);
      await expect(service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_4')).rejects.toThrowError('no such player');
    });

    it('should throw an error if the given player has already been replaced', async () => {
      gamesService.game.slots[0].status = 'replaced';
      await expect(service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1')).rejects.toThrowError('this player has already been replaced');
    });

    it('should update the player status', async () => {
      const spy = jest.spyOn(gamesService.game, 'save');
      const game = await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(game).toEqual(gamesService.game as any);
      const tSlot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_1');
      expect(tSlot.status).toEqual('waiting for substitute');
      expect(spy).toHaveBeenCalled();
    });

    it('should emit the  event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(spy).toHaveBeenCalledWith(game);
    });

    it('should reject if the game is no longer active', async () => {
      const game = { ...mockGame, state: 'ended' };
      jest.spyOn(gamesService, 'getById').mockResolvedValue(game);

      await expect(service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1')).rejects.toThrowError('the game has already ended');
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifySubstituteRequest');
      await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(spy).toHaveBeenCalledWith({
        gameId: 'FAKE_GAME_ID',
        gameNumber: 1,
        gameClass: 'soldier',
        team: 'RED',
      });
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      const game2 = await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(game1).toEqual(game2);
    });
  });

  describe('#cancelSubstitutionRequest()', () => {
    beforeEach(() => {
      gamesService.game.slots[0].status = 'waiting for substitute';
    });

    it('should throw an error if the given game does not exist', async () => {
      await expect(service.cancelSubstitutionRequest('asdf34qfwdsaf', 'FAKE_PLAYER_1')).rejects.toThrowError('no such game');
    });

    it('should throw an error if the given player does not exist', async () => {
      jest.spyOn(playersService, 'getById').mockResolvedValue(null);
      await expect(service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_4')).rejects.toThrowError('no such player');
    });

    it('should throw an error if the given player has already been replaced', async () => {
      gamesService.game.slots[0].status = 'replaced';
      await expect(service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1')).rejects.toThrowError('this player has already been replaced');
    });

    it('should update the player status', async () => {
      const spy = jest.spyOn(gamesService.game, 'save');
      const game = await service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(game).toEqual(gamesService.game as any);
      expect(game.slots[0].status).toEqual('active');
      expect(spy).toHaveBeenCalled();
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(spy).toHaveBeenCalledWith(game);
    });

    it('should reject if the game is no longer active', async () => {
      gamesService.game.state = 'ended';
      await expect(service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1')).rejects.toThrowError('the game has already ended');
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing if the player is already marked', async () => {
      const game1 = await service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      const game2 = await service.cancelSubstitutionRequest('FAKE_GAME_ID', 'FAKE_PLAYER_1');
      expect(game1).toEqual(game2);
    });
  });

  describe('#replacePlayer()', () => {
    beforeEach(() => {
      gamesService.game.slots[0].status = 'waiting for substitute';
    });

    it('should replace the player', async () => {
      const spy = jest.spyOn(gamesService.game, 'save');
      // replace player 1 with player 3
      const game = await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      expect(game).toEqual(gamesService.game as any);
      const replaceeSlot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_1');
      expect(replaceeSlot.status).toBe('replaced');
      const replacementSlot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_3');
      expect(replacementSlot).toBeTruthy();
      expect(replacementSlot.status).toBe('active');
      expect(game.players.find((p: any) => p.id === 'FAKE_PLAYER_3')).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });

    it('should emit the event', async () => {
      const spy = jest.spyOn(gamesGateway, 'emitGameUpdated');
      const game = await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      expect(spy).toHaveBeenCalledWith(game);
    });

    it('should replace the player in-game', async done => {
      const spy = jest.spyOn(gameRuntimeService, 'replacePlayer');
      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID', 'FAKE_PLAYER_1', jasmine.objectContaining({ playerId: 'FAKE_PLAYER_3' }));
        done();
      }, 100);
    });

    it('should reject if the given player is banned', async () => {
      const end = new Date();
      end.setHours(end.getHours() + 1);
      const spy = jest.spyOn(playerBansService, 'getPlayerActiveBans').mockResolvedValue([
        { player: 'FAKE_PLAYER_ID', admin: 'FAKE_ADMIN_ID', start: new Date(), end },
      ] as never);

      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3')).rejects.toThrowError('player is banned');
      expect(spy).toHaveBeenCalledWith('FAKE_PLAYER_3');
    });

    it('should reject if replacee is marked as active', async () => {
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_2', 'FAKE_PLAYER_3')).rejects.toThrowError('the replacee is marked as active');
    });

    it('should mark the slot back as active if a player is subbing himself', async () => {
      const spy = jest.spyOn(gamesService.game, 'save');
      const game = await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_1');
      expect(game).toEqual(gamesService.game as any);
      const slot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_1');
      expect(slot.status).toBe('active');
      expect(game.slots.length).toBe(2);
      expect(spy).toHaveBeenCalled();
    });

    it('should reject if the given player has already been replaced', async () => {
      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3')).rejects
        .toThrowError('this player has already been replaced');
    });

    it('should reject if the given player is involved in another game', async () => {
      jest.spyOn(gamesService, 'getPlayerActiveGame').mockResolvedValue({ id: 'FAKE_GAME_ID_2' });
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3')).rejects
        .toThrowError('player is involved in a currently running game');
    });

    it('should call gateway', async () => {
      const spy = jest.spyOn(queueGateway, 'updateSubstituteRequests');
      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      expect(spy).toHaveBeenCalled();
    });

    it('should reject if the replacement player does not exist', async () => {
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'some nonexistent player id')).rejects
        .toThrowError('no such player');
    });

    it('should reject if the replacement player is involved in an active game', async () => {
      jest.spyOn(gamesService, 'getPlayerActiveGame').mockResolvedValue(mockGame);
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3')).rejects
        .toThrowError('player is involved in a currently running game');
    });

    it('should kick the replacement player from the queue', async () => {
      const spy = jest.spyOn(queueService, 'kick');
      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      expect(spy).toHaveBeenCalledWith('FAKE_PLAYER_3');
    });

    it('should announce the replacement in the game', async () => {
      const spy = jest.spyOn(gameRuntimeService, 'sayChat');
      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID', 'PLAYER_3 is replacing PLAYER_1 on soldier.');
    });
  });

  it('should replace the player if replacement is replacing a game he was previously subbed out of', async () => {
    await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1');
    await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_1', 'FAKE_PLAYER_3');
    await service.substitutePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_3');
    const game = await service.replacePlayer('FAKE_GAME_ID', 'FAKE_PLAYER_3', 'FAKE_PLAYER_1');
    expect(game).toBeTruthy();

    const player1Slot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_1');
    expect(player1Slot).toBeTruthy();
    expect(player1Slot.status).toBe('active');

    const player3Slot = game.slots.find(s => s.playerId === 'FAKE_PLAYER_3');
    expect(player3Slot).toBeTruthy();
    expect(player3Slot.status).toBe('replaced');
  });
});
