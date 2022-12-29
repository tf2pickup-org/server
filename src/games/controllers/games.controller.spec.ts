import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { Game } from '../models/game';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Player } from '@/players/models/player';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { Events } from '@/events/events';
import { GameServerAssignerService } from '../services/game-server-assigner.service';

jest.mock('../services/player-substitution.service');
jest.mock('../services/game-server-assigner.service');

class GamesServiceStub {
  games: Game[] = [
    {
      number: 1,
      map: 'cp_fake_rc1',
      state: 'ended',
      launchedAt: new Date(1635884999789),
      endedAt: new Date(1635888599789),
      assignedSkills: new Map([['FAKE_PLAYER_ID', 1]]),
    } as Game,
    {
      number: 2,
      map: 'cp_fake_rc2',
      state: 'launching',
      assignedSkills: new Map([['FAKE_PLAYER_ID', 5]]),
    } as Game,
  ];
  getById(id: string) {
    return Promise.resolve(this.games[0]);
  }
  getGames(sort: any, limit: number, skip: number) {
    return Promise.resolve(this.games);
  }
  getGameCount() {
    return Promise.resolve(2);
  }
  getPlayerGames(playerId: string, sort: any, limit: number, skip: number) {
    return Promise.resolve(this.games);
  }
  getPlayerGameCount(playerId: string) {
    return Promise.resolve(1);
  }
  getVoiceChannelUrl(gameId: string, playerId: string) {
    return Promise.resolve(null);
  }
  forceEnd = jest.fn().mockResolvedValue(undefined);
}

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesServiceStub;
  let playerSubstitutionService: PlayerSubstitutionService;
  let events: Events;
  let gameServerAssignerService: GameServerAssignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
        PlayerSubstitutionService,
        Events,
        GameServerAssignerService,
      ],
      controllers: [GamesController],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    gamesService = module.get(GamesService);
    playerSubstitutionService = module.get(PlayerSubstitutionService);
    events = module.get(Events);
    gameServerAssignerService = module.get(GameServerAssignerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGames()', () => {
    describe('when playerId is undefined', () => {
      it('should return games', async () => {
        const spy = jest.spyOn(gamesService, 'getGames');
        const ret = await controller.getGames(10, 0, { 'events.0.at': -1 });
        expect(spy).toHaveBeenCalledWith({ 'events.0.at': -1 }, 10, 0);
        expect(ret).toEqual({
          results: gamesService.games,
          itemCount: 2,
        });
      });
    });

    describe('when playerId is specified', () => {
      it('should return player games', async () => {
        const spy = jest.spyOn(gamesService, 'getPlayerGames');
        const ret = await controller.getGames(
          10,
          0,
          { 'events.0.at': -1 },
          'FAKE_PLAYER_ID',
        );
        expect(spy).toHaveBeenCalledWith(
          'FAKE_PLAYER_ID',
          { 'events.0.at': -1 },
          10,
          0,
        );
        expect(ret).toEqual({
          results: gamesService.games,
          itemCount: 1,
        });
      });
    });
  });

  describe('#getGame()', () => {
    it('should return the given game', async () => {
      const ret = await controller.getGame('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0]);
    });
  });

  describe('#getConnectInfo()', () => {
    beforeEach(() => {
      jest.spyOn(gamesService, 'getById').mockResolvedValue({
        id: 'FAKE_ID',
        connectInfoVersion: 1,
        connectString: 'FAKE_CONNECT_STRING',
      } as Game);
      jest
        .spyOn(gamesService, 'getVoiceChannelUrl')
        .mockResolvedValue('FAKE_VOICE_CHANNEL_URL');
    });

    it('should return connect info', async () => {
      const ret = await controller.getConnectInfo('FAKE_ID', {
        id: 'FAKE_PLAYER_ID',
      } as Player);
      expect(ret.gameId).toEqual('FAKE_ID');
      expect(ret.connectInfoVersion).toEqual(1);
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
      expect(ret.voiceChannelUrl).toEqual('FAKE_VOICE_CHANNEL_URL');
    });

    describe('when the player does not take part in the game', () => {
      beforeEach(() => {
        jest
          .spyOn(gamesService, 'getVoiceChannelUrl')
          .mockRejectedValue(
            new PlayerNotInThisGameError('FAKE_PLAYER_ID', 'FAKE_GAME_ID'),
          );
      });

      it('should reject with 401', async () => {
        await expect(
          controller.getConnectInfo('FAKE_GAME_ID', {
            id: 'FAKE_PLAYER_ID',
          } as Player),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('when the connect info is undefined', () => {
      beforeEach(() => {
        jest.spyOn(gamesService, 'getById').mockResolvedValue({
          id: 'FAKE_ID',
          connectInfoVersion: 1,
        } as Game);
      });

      it('should return undefined', async () => {
        const ret = await controller.getConnectInfo('FAKE_ID', {
          id: 'FAKE_PLAYER_ID',
        } as Player);
        expect(ret.connectString).toBe(undefined);
      });
    });
  });

  describe('#getGameSkills()', () => {
    it('should return given game assigned skills', async () => {
      const ret = await controller.getGameSkills('FAKE_ID');
      expect(ret).toEqual(gamesService.games[0].assignedSkills);
    });
  });

  describe('#takeAdminAction()', () => {
    it('should emit the gameReconfigureRequested event', async () => {
      let emittedGameId: string, emittedAdminId: string;
      events.gameReconfigureRequested.subscribe(({ gameId, adminId }) => {
        emittedGameId = gameId;
        emittedAdminId = adminId;
      });

      await controller.takeAdminAction(
        'FAKE_GAME_ID',
        '',
        undefined,
        undefined,
        undefined,
        undefined,
        { id: 'FAKE_ADMIN_ID' } as Player,
        {},
      );
      expect(emittedGameId).toEqual('FAKE_GAME_ID');
      expect(emittedAdminId).toEqual('FAKE_ADMIN_ID');
    });

    it('should force end the game', async () => {
      await controller.takeAdminAction(
        'FAKE_GAME_ID',
        undefined,
        '',
        undefined,
        undefined,
        undefined,
        { id: 'FAKE_ADMIN_ID' } as Player,
        {},
      );
      expect(gamesService.forceEnd).toHaveBeenCalledWith(
        'FAKE_GAME_ID',
        'FAKE_ADMIN_ID',
      );
    });

    it('should substitute player', async () => {
      const spy = jest.spyOn(playerSubstitutionService, 'substitutePlayer');
      await controller.takeAdminAction(
        'FAKE_GAME_ID',
        undefined,
        undefined,
        'FAKE_PLAYER_ID',
        undefined,
        undefined,
        { id: 'FAKE_ADMIN_ID' } as Player,
        {},
      );
      expect(spy).toHaveBeenCalledWith(
        'FAKE_GAME_ID',
        'FAKE_PLAYER_ID',
        'FAKE_ADMIN_ID',
      );
    });

    it('should cancel substitution request', async () => {
      const spy = jest.spyOn(
        playerSubstitutionService,
        'cancelSubstitutionRequest',
      );
      await controller.takeAdminAction(
        'FAKE_GAME_ID',
        undefined,
        undefined,
        undefined,
        'FAKE_PLAYER_ID',
        undefined,
        { id: 'FAKE_ADMIN_ID' } as Player,
        {},
      );
      expect(spy).toHaveBeenCalledWith(
        'FAKE_GAME_ID',
        'FAKE_PLAYER_ID',
        'FAKE_ADMIN_ID',
      );
    });

    describe('reassign server', () => {
      it('should reassign gameserver', async () => {
        await controller.takeAdminAction(
          'FAKE_GAME_ID',
          undefined,
          undefined,
          undefined,
          undefined,
          '',
          { id: 'FAKE_ADMIN_ID' } as Player,
          { id: 'FAKE_GAMESERVER_ID', provider: 'FAKE_PROVIDER' },
        );
        expect(gameServerAssignerService.assignGameServer).toHaveBeenCalledWith(
          'FAKE_GAME_ID',
          {
            id: 'FAKE_GAMESERVER_ID',
            provider: 'FAKE_PROVIDER',
          },
        );
      });

      describe('when gameserver is invalid', () => {
        it('should return 400', async () => {
          await expect(
            controller.takeAdminAction(
              'FAKE_GAME_ID',
              undefined,
              undefined,
              undefined,
              undefined,
              '',
              { id: 'FAKE_ADMIN_ID' } as Player,
              { id: 'FAKE_GAMESERVER_ID' }, // missing provider
            ),
          ).rejects.toThrow(BadRequestException);
        });
      });
    });
  });
});
