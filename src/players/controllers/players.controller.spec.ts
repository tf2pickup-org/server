import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from '../services/players.service';
import { Player } from '../models/player';
import { PlayerStatsDto } from '../dto/player-stats.dto';
import { PlayerBansService } from '../services/player-bans.service';
import { BadRequestException } from '@nestjs/common';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { plainToInstance } from 'class-transformer';
import { PlayerBan } from '../models/player-ban';
import { LinkedProfilesService } from '../services/linked-profiles.service';
import { LinkedProfileProviderName } from '../types/linked-profile-provider-name';
import { Types } from 'mongoose';
import { ImportExportSkillService } from '../services/import-export-skill.service';
import { PlayerSkillRecordMalformedError } from '../errors/player-skill-record-malformed.error';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { PlayerId } from '../types/player-id';
import { CacheModule } from '@nestjs/cache-manager';
import { QUEUE_CONFIG } from '@/queue-config/queue-config.token';

jest.mock('../services/linked-profiles.service');
jest.mock('../services/import-export-skill.service');

const playerId = new Types.ObjectId() as PlayerId;

class PlayersServiceStub {
  player = plainToInstance(Player, {
    _id: playerId.toString(),
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    hasAcceptedRules: true,
    skill: {
      [Tf2ClassName.scout]: 1,
      [Tf2ClassName.soldier]: 2,
    },
  });
  stats: PlayerStatsDto = {
    player: playerId.toString(),
    gamesPlayed: 220,
    classesPlayed: {
      [Tf2ClassName.scout]: 19,
      [Tf2ClassName.soldier]: 102,
      [Tf2ClassName.demoman]: 0,
      [Tf2ClassName.medic]: 92,
    },
  };
  getAll = jest.fn().mockResolvedValue([this.player]);
  getById = jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(this.player));
  findBySteamId = jest
    .fn()
    .mockImplementation((steamId: string) => Promise.resolve(this.player));
  forceCreatePlayer = jest
    .fn()
    .mockImplementation((player: Player) => Promise.resolve(player));
  updatePlayer = jest
    .fn()
    .mockImplementation((playerId: string, update: Partial<Player>) =>
      Promise.resolve(this.player),
    );
  getPlayerStats = jest
    .fn()
    .mockImplementation((playerId: string) => Promise.resolve(this.stats));
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
  getPlayerBans = jest
    .fn()
    .mockImplementation((playerId: string) => Promise.resolve(this.bans));
  addPlayerBan = jest
    .fn()
    .mockImplementation((ban: PlayerBan) => Promise.resolve(ban));
}

const queueConfig: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.scout,
      count: 2,
    },
    {
      name: Tf2ClassName.soldier,
      count: 2,
    },
    {
      name: Tf2ClassName.demoman,
      count: 1,
    },
    {
      name: Tf2ClassName.medic,
      count: 1,
    },
  ],
};

describe('Players Controller', () => {
  let controller: PlayersController;
  let playersService: PlayersServiceStub;
  let playerBansService: PlayerBansServiceStub;
  let linkedProfilesService: jest.Mocked<LinkedProfilesService>;
  let importExportSkillService: jest.Mocked<ImportExportSkillService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        LinkedProfilesService,
        ImportExportSkillService,
        {
          provide: QUEUE_CONFIG,
          useValue: queueConfig,
        },
      ],
      controllers: [PlayersController],
      imports: [CacheModule.register()],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    linkedProfilesService = module.get(LinkedProfilesService);
    importExportSkillService = module.get(ImportExportSkillService);
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
      const ret = await controller.getPlayer(playersService.player);
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
      const adminId = new Types.ObjectId() as PlayerId;
      const spy = jest.spyOn(playersService, 'updatePlayer');
      const ret = await controller.updatePlayer(
        playersService.player,
        { name: 'FAKE_NEW_NAME' },
        { _id: adminId } as Player,
      );
      expect(spy).toHaveBeenCalledWith(
        playersService.player._id,
        { name: 'FAKE_NEW_NAME' },
        adminId,
      );
      expect(ret).toEqual(playersService.player as any);
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return player stats', async () => {
      const spy = jest.spyOn(playersService, 'getPlayerStats');
      const ret = await controller.getPlayerStats(playersService.player);
      expect(spy).toHaveBeenCalledWith(playerId);
      expect(ret).toEqual(playersService.stats);
    });
  });

  describe('#getAllPlayersWithSkills()', () => {
    it('should return all players with their skills', async () => {
      await controller.getAllPlayersWithSkills();
      expect(playersService.getAll).toHaveBeenCalled();
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should return player skill', () => {
      const ret = controller.getPlayerSkill(playersService.player);
      expect(ret).toEqual({ scout: 1, soldier: 2 });
    });

    describe('when the player has no skill set', () => {
      it('should return an empty object', () => {
        const playerWithoutSkill = plainToInstance(Player, {
          _id: new Types.ObjectId().toString(),
          name: 'FAKE_2ND_PLAYER_NAME',
          steamId: 'FAKE_2ND_STEAM_ID',
          hasAcceptedRules: true,
        });

        const ret = controller.getPlayerSkill(playerWithoutSkill);
        expect(ret).toEqual({});
      });
    });
  });

  describe('#setPlayerSkill()', () => {
    // todo
  });

  describe('#getPlayerBans()', () => {
    it('should return player bans', async () => {
      const spy = jest.spyOn(playerBansService, 'getPlayerBans');
      const ret = await controller.getPlayerBans(playersService.player);
      expect(spy).toHaveBeenCalledWith(playerId);
      expect(ret).toEqual(playerBansService.bans as any);
    });
  });

  describe('#getPlayerLinkedProfiles()', () => {
    const linkedProfiles = [
      {
        player: playerId.toString(),
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
      const result = await controller.getPlayerLinkedProfiles(
        playersService.player,
      );
      expect(linkedProfilesService.getLinkedProfiles).toHaveBeenCalledWith(
        playerId,
      );
      expect(result).toEqual({ playerId: playerId.toString(), linkedProfiles });
    });
  });

  describe('#importSkills()', () => {
    it('should import skills from uploaded file', async () => {
      const ret = await controller.importSkills({
        buffer: Buffer.from('"76561198074409147",1,2', 'utf-8'),
      } as Express.Multer.File);
      expect(
        importExportSkillService.importRawSkillRecord,
      ).toHaveBeenCalledWith(['76561198074409147', '1', '2']);
      expect(ret).toEqual({ noImported: 1 });
    });

    describe('when import fails', () => {
      beforeEach(() => {
        importExportSkillService.importRawSkillRecord.mockRejectedValue(
          new PlayerSkillRecordMalformedError(5),
        );
      });

      it('should handle errors gracefully', async () => {
        await expect(
          controller.importSkills({
            buffer: Buffer.from('"76561198074409147",1,2', 'utf-8'),
          } as Express.Multer.File),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
