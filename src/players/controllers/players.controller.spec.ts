import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from '../services/players.service';
import { Player } from '../models/player';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { PlayerStats } from '../dto/player-stats';
import { PlayerSkillService } from '../services/player-skill.service';
import { PlayerSkill } from '../models/player-skill';
import { PlayerBansService } from '../services/player-bans.service';
import {
  NotFoundException,
  BadRequestException,
  CacheModule,
} from '@nestjs/common';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { plainToClass } from 'class-transformer';
import { PlayerBan } from '../models/player-ban';
import { LinkedProfilesService } from '../services/linked-profiles.service';
import { LinkedProfileProviderName } from '../types/linked-profile-provider-name';
import { LinkedProfiles } from '../dto/linked-profiles';
import { Types } from 'mongoose';

jest.mock('../services/linked-profiles.service');

class PlayersServiceStub {
  player = plainToClass(Player, {
    _id: 'FAKE_ID',
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    hasAcceptedRules: true,
  });
  stats: PlayerStats = new PlayerStats({
    player: 'FAKE_ID',
    gamesPlayed: 220,
    classesPlayed: new Map([
      [Tf2ClassName.scout, 19],
      [Tf2ClassName.soldier, 102],
      [Tf2ClassName.demoman, 0],
      [Tf2ClassName.medic, 92],
    ]),
  });
  getAll() {
    return new Promise((resolve) => resolve([this.player]));
  }
  getById(id: string) {
    return new Promise((resolve) => resolve(this.player));
  }
  forceCreatePlayer(player: Player) {
    return new Promise((resolve) => resolve(player));
  }
  updatePlayer(playerId: string, update: Partial<Player>) {
    return new Promise((resolve) => resolve(this.player));
  }
  getPlayerStats(playerId: string) {
    return new Promise((resolve) => resolve(this.stats));
  }
}

class GamesServiceStub {
  games: Game[] = [
    { number: 1, map: 'cp_fake_rc1', state: 'ended', slots: [] } as Game,
    { number: 2, map: 'cp_fake_rc2', state: 'launching', slots: [] } as Game,
  ];
  getPlayerGames(
    playerId: string,
    sort: any = { launchedAt: -1 },
    limit = 10,
    skip = 0,
  ) {
    return Promise.resolve(this.games);
  }

  getPlayerGameCount() {
    return Promise.resolve(2);
  }
}

class PlayerSkillServiceStub {
  skill: PlayerSkill = {
    player: 'FAKE_ID' as any,
    skill: new Map<Tf2ClassName, number>([
      [Tf2ClassName.scout, 2],
      [Tf2ClassName.soldier, 2],
      [Tf2ClassName.demoman, 1],
      [Tf2ClassName.medic, 2],
    ]),
  };
  getPlayerSkill(playerId: string) {
    return new Promise((resolve) => resolve(this.skill));
  }
  setPlayerSkill(playerId: string, skill: Map<string, number>) {
    return Promise.resolve(this.skill);
  }
  getAll() {
    return new Promise((resolve) => resolve([this.skill]));
  }
}

class PlayerBansServiceStub {
  bans = [
    {
      player: '5d448875b963ff7e00c6b6b3',
      admin: '5d448875b963ff7e00c6b6b3',
      start: '2019-12-16T00:23:55.000Z',
      end: '2019-12-17T01:51:49.183Z',
      reason: 'test',
      id: '5df833c256e77d8768130f9a',
    },
    {
      player: '5d448875b963ff7e00c6b6b3',
      start: '2019-10-29T13:23:38.626Z',
      end: '2019-10-29T14:23:38.626Z',
      reason: 'test',
      admin: '5d448875b963ff7e00c6b6b3',
      id: '5db83d5a593cc645933cce54',
    },
    {
      player: '5d448875b963ff7e00c6b6b3',
      start: '2019-10-25T12:15:54.882Z',
      end: '2019-10-25T12:16:25.442Z',
      reason: 'test',
      admin: '5d448875b963ff7e00c6b6b3',
      id: '5db2e77abbf17f2a9101a9f6',
    },
    {
      player: '5d448875b963ff7e00c6b6b3',
      start: '2019-10-25T12:06:20.123Z',
      end: '2019-10-25T12:06:28.919Z',
      reason: 'test',
      admin: '5d448875b963ff7e00c6b6b3',
      id: '5db2e53c80e22f6e05200875',
    },
  ];
  getPlayerBans(playerId: string) {
    return new Promise((resolve) => resolve(this.bans));
  }
  addPlayerBan(ban: any) {
    return new Promise((resolve) => resolve(ban));
  }
}

describe('Players Controller', () => {
  let controller: PlayersController;
  let playersService: PlayersServiceStub;
  let gamesService: GamesServiceStub;
  let playerSkillService: PlayerSkillServiceStub;
  let playerBansService: PlayerBansServiceStub;
  let linkedProfilesService: jest.Mocked<LinkedProfilesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        LinkedProfilesService,
      ],
      controllers: [PlayersController],
      imports: [CacheModule.register()],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    playerSkillService = module.get(PlayerSkillService);
    playerBansService = module.get(PlayerBansService);
    linkedProfilesService = module.get(LinkedProfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllPlayers()', () => {
    it('should return all players', async () => {
      const spy = jest.spyOn(playersService, 'getAll');
      const players = await controller.getAllPlayers();
      expect(spy).toHaveBeenCalled();
      expect(players).toEqual([playersService.player] as any[]);
    });
  });

  describe('#getPlayer()', () => {
    it('should return the player', async () => {
      const spy = jest.spyOn(playersService, 'getById');
      const ret = await controller.getPlayer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.player as any);
    });
  });

  describe('#forceCreatePlayer()', () => {
    it('should call the service', async () => {
      const spy = jest.spyOn(playersService, 'forceCreatePlayer');
      await controller.forceCreatePlayer({
        name: 'FAKE_PLAYER_NAME',
        steamId: 'FAKE_PLAYER_STEAM_ID',
      });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FAKE_PLAYER_NAME',
          steamId: 'FAKE_PLAYER_STEAM_ID',
        }),
      );
    });
  });

  describe('#updatePlayer()', () => {
    it('should update the player', async () => {
      const spy = jest.spyOn(playersService, 'updatePlayer');
      const ret = await controller.updatePlayer(
        'FAKE_ID',
        { name: 'FAKE_NEW_NAME' },
        { id: 'FAKE_ADMIN_ID' } as any,
      );
      expect(spy).toHaveBeenCalledWith(
        'FAKE_ID',
        { name: 'FAKE_NEW_NAME' },
        'FAKE_ADMIN_ID',
      );
      expect(ret).toEqual(playersService.player as any);
    });
  });

  describe('#getPlayerGames()', () => {
    it('should return player games', async () => {
      const spy1 = jest.spyOn(gamesService, 'getPlayerGames');
      const spy2 = jest.spyOn(gamesService, 'getPlayerGameCount');

      const ret = await controller.getPlayerGames(
        'FAKE_ID',
        44,
        52,
        'launched_at',
      );
      expect(spy1).toHaveBeenCalledWith('FAKE_ID', { launchedAt: 1 }, 44, 52);
      expect(spy2).toHaveBeenCalled();
      expect(ret).toEqual({
        results: gamesService.games,
        itemCount: 2,
      } as any);
    });

    it('should throw an error unless the sort param is correct', async () => {
      await expect(
        controller.getPlayerGames('FAKE_ID', 3, 5, 'lol'),
      ).rejects.toThrow();
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return player stats', async () => {
      const spy = jest.spyOn(playersService, 'getPlayerStats');
      const ret = await controller.getPlayerStats('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playersService.stats);
    });
  });

  describe('#getAllPlayerSkills()', () => {
    it("should return all players' skills", async () => {
      const spy = jest.spyOn(playerSkillService, 'getAll');
      const ret = await controller.getAllPlayerSkills();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual([playerSkillService.skill] as any);
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should return player skill', async () => {
      const spy = jest.spyOn(playerSkillService, 'getPlayerSkill');
      const ret = await controller.getPlayerSkill('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playerSkillService.skill);
    });

    it('should return 404', async () => {
      jest.spyOn(playerSkillService, 'getPlayerSkill').mockResolvedValue(null);
      await expect(controller.getPlayerSkill('FAKE_ID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const skill = { soldier: 1, medic: 2 };
      const spy = jest.spyOn(playerSkillService, 'setPlayerSkill');
      const ret = await controller.setPlayerSkill('FAKE_ID', skill, {
        id: 'FAKE_ADMIN_ID',
      } as any);
      expect(spy).toHaveBeenCalledWith(
        'FAKE_ID',
        new Map([
          ['soldier', 1],
          ['medic', 2],
        ]),
        'FAKE_ADMIN_ID',
      );
      expect(ret).toEqual(playerSkillService.skill);
    });
  });

  describe('#getPlayerBans()', () => {
    it('should return player bans', async () => {
      const spy = jest.spyOn(playerBansService, 'getPlayerBans');
      const ret = await controller.getPlayerBans('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(playerBansService.bans as any);
    });
  });

  describe('#addPlayerBan()', () => {
    const ban = {
      player: new Types.ObjectId('5d448875b963ff7e00c6b6b3'),
      admin: new Types.ObjectId('5d448875b963ff7e00c6b6b3'),
      start: new Date('2019-12-16T00:23:55.000Z'),
      end: new Date('2019-12-17T01:51:49.183Z'),
      reason: 'dupa',
      id: '5df833c256e77d8768130f9a',
    };

    it('should add player ban', async () => {
      const spy = jest.spyOn(playerBansService, 'addPlayerBan');
      const ret = await controller.addPlayerBan(
        ban as PlayerBan,
        { id: '5d448875b963ff7e00c6b6b3' } as Player,
      );
      expect(spy).toHaveBeenCalledWith(ban);
      expect(ret).toEqual(ban as any);
    });

    it("should fail if the authorized user id is not the same as admin's", async () => {
      await expect(
        controller.addPlayerBan(ban as any, { id: 'SOME_ID' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('#getPlayerLinkedProfiles()', () => {
    const linkedProfiles = [
      {
        player: '6054cd120504423a7dd0dcc8',
        userId: '75739124',
        login: 'm_maly',
        displayName: 'm_maly',
        profileImageUrl:
          'https://static-cdn.jtvnw.net/jtv_user_pictures/9330a24b-a956-407c-910b-5b975950d122-profile_image-300x300.png',
        provider: 'twitch.tv' as LinkedProfileProviderName,
      },
    ];

    beforeEach(() => {
      linkedProfilesService.getLinkedProfiles.mockResolvedValue(linkedProfiles);
    });

    it('should query the service', async () => {
      const result = await controller.getPlayerLinkedProfiles('FAKE_PLAYER_ID');
      expect(linkedProfilesService.getLinkedProfiles).toHaveBeenCalledWith(
        'FAKE_PLAYER_ID',
      );
      expect(result).toEqual(
        new LinkedProfiles('FAKE_PLAYER_ID', linkedProfiles),
      );
    });
  });
});
