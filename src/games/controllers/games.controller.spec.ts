import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from '../services/games.service';
import { Game } from '../models/game';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Player } from '@/players/models/player';
import { Events } from '@/events/events';
import { GameServerAssignerService } from '../services/game-server-assigner.service';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { GameState } from '../models/game-state';
import { VoiceChannelUrlsService } from '../services/voice-channel-urls.service';

jest.mock('../services/player-substitution.service');
jest.mock('../services/game-server-assigner.service');
jest.mock('@/players/pipes/player-by-id.pipe');
jest.mock('../services/voice-channel-urls.service');

class GamesServiceStub {
  games: Game[] = [
    {
      id: 'FAKE_GAME_ID',
      number: 1,
      map: 'cp_fake_rc1',
      state: 'ended',
      launchedAt: new Date(1635884999789),
      endedAt: new Date(1635888599789),
      assignedSkills: new Map([['FAKE_PLAYER_ID', 1]]),
    } as Game,
    {
      id: 'FAKE_GAME_2_ID',
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
  forceEnd = jest.fn().mockResolvedValue(undefined);
  calculatePlayerJoinGameServerTimeout = jest.fn().mockResolvedValue(undefined);
}

describe('Games Controller', () => {
  let controller: GamesController;
  let gamesService: GamesServiceStub;
  let playerSubstitutionService: PlayerSubstitutionService;
  let events: Events;
  let gameServerAssignerService: GameServerAssignerService;
  let voiceChannelUrlsService: jest.Mocked<VoiceChannelUrlsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GamesService, useClass: GamesServiceStub },
        PlayerSubstitutionService,
        Events,
        GameServerAssignerService,
        VoiceChannelUrlsService,
      ],
      controllers: [GamesController],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    gamesService = module.get(GamesService);
    playerSubstitutionService = module.get(PlayerSubstitutionService);
    events = module.get(Events);
    gameServerAssignerService = module.get(GameServerAssignerService);
    voiceChannelUrlsService = module.get(VoiceChannelUrlsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGames()', () => {
    describe('when playerId is undefined', () => {
      it('should return games', async () => {
        const spy = jest.spyOn(gamesService, 'getGames');
        const ret = await controller.getGames(10, 0, { 'events.0.at': -1 }, [
          GameState.ended,
          GameState.interrupted,
        ]);
        expect(spy).toHaveBeenCalledWith(
          {
            state: [GameState.ended, GameState.interrupted],
          },
          { sort: { 'events.0.at': -1 }, limit: 10, skip: 0 },
        );
        expect(ret).toEqual({
          results: gamesService.games,
          itemCount: 2,
        });
      });
    });

    describe('when the player is specified', () => {
      it('should return player games', async () => {
        const playerId = new Types.ObjectId() as PlayerId;
        const spy = jest.spyOn(gamesService, 'getGames');
        const ret = await controller.getGames(
          10,
          0,
          { 'events.0.at': -1 },
          [GameState.ended, GameState.interrupted],
          {
            _id: playerId,
          } as Player,
        );
        expect(spy).toHaveBeenCalledWith(
          {
            state: [GameState.ended, GameState.interrupted],
            'slots.player': playerId,
          },
          { sort: { 'events.0.at': -1 }, limit: 10, skip: 0 },
        );
        expect(ret).toEqual({
          results: gamesService.games,
          itemCount: expect.any(Number),
        });
      });
    });
  });

  describe('#getGame()', () => {
    it('should return the given game', () => {
      const ret = controller.getGame(gamesService.games[0]);
      expect(ret).toEqual(gamesService.games[0]);
    });
  });

  describe('#getConnectInfo()', () => {
    beforeEach(() => {
      voiceChannelUrlsService.getVoiceChannelUrl.mockResolvedValue(
        'FAKE_VOICE_CHANNEL_URL',
      );
    });

    it('should return connect info', async () => {
      const ret = await controller.getConnectInfo(
        {
          id: 'FAKE_GAME_ID',
          connectInfoVersion: 1,
          connectString: 'FAKE_CONNECT_STRING',
        } as Game,
        {
          id: 'FAKE_PLAYER_ID',
        } as Player,
      );
      expect(ret.gameId).toEqual('FAKE_GAME_ID');
      expect(ret.connectInfoVersion).toEqual(1);
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
      expect(ret.voiceChannelUrl).toEqual('FAKE_VOICE_CHANNEL_URL');
    });

    describe('when the connect info is undefined', () => {
      beforeEach(() => {
        jest.spyOn(gamesService, 'getById').mockResolvedValue({
          id: 'FAKE_ID',
          connectInfoVersion: 1,
        } as Game);
      });

      it('should return undefined', async () => {
        const ret = await controller.getConnectInfo(gamesService.games[0], {
          id: 'FAKE_PLAYER_ID',
        } as Player);
        expect(ret.connectString).toBe(undefined);
      });
    });
  });

  describe('#getGameSkills()', () => {
    it('should return given game assigned skills', () => {
      const ret = controller.getGameSkills(gamesService.games[0]);
      expect(ret).toEqual(gamesService.games[0].assignedSkills);
    });
  });
});
