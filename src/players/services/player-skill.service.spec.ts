import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayersService } from './players.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import * as fs from 'fs';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { Etf2lProfileService } from './etf2l-profile.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { Player } from '../models/player';

jest.mock('./players.service');
jest.mock('@/discord/services/discord-notifications.service');
jest.mock('./future-player-skill.service');
jest.mock('./etf2l-profile.service');

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'soldier' },
    ],
  };
}

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;
  let mongod: MongoMemoryServer;
  let playerSkillModel: ReturnModelType<typeof PlayerSkill>;
  let mockPlayer: DocumentType<Player>;
  let mockPlayerSkill: DocumentType<PlayerSkill>;
  let playersService: PlayersService;
  let futurePlayerSkillService: FuturePlayerSkillService;
  let etf2lProfileService: Etf2lProfileService;
  let discordNotificationsService: DiscordNotificationsService;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ PlayerSkill, Player ]),
      ],
      providers: [
        PlayerSkillService,
        PlayersService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        FuturePlayerSkillService,
        Etf2lProfileService,
        DiscordNotificationsService,
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
    playerSkillModel = module.get(getModelToken('PlayerSkill'));
    playersService = module.get(PlayersService);
    futurePlayerSkillService = module.get(FuturePlayerSkillService);
    etf2lProfileService = module.get(Etf2lProfileService);
    discordNotificationsService = module.get(DiscordNotificationsService);

    service.onModuleInit();
  });

  beforeEach(async () => {
    // @ts-expect-error
    mockPlayer = await playersService._createOne();
    mockPlayerSkill = await playerSkillModel.create({
      player: mockPlayer.id,
      skill: {
        soldier: 4,
      },
    });
  });

  afterEach(async () => {
    await playerSkillModel.deleteMany({ });
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upon player registration', () => {
    describe('when there is no future skill', () => {
      it('should not update player\'s skill', async done => {
        // @ts-expect-error
        const newPlayer = await playersService._createOne();

        // @ts-expect-error
        playersService.playerRegistered.next(newPlayer.id.toString());
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: newPlayer.id })).toBe(null);
          done();
        }, 100);
      });
    });

    describe('when there is future skill for the given player', () => {
      beforeEach(() => {
        // @ts-expect-error
        futurePlayerSkillService.findSkill = () => Promise.resolve({ steamId: mockPlayer.steamId, skill: new Map([['soldier', 2]]) });
      });

      it('should update player\'s skill', done => {
        // @ts-expect-error
        playersService.playerRegistered.next(mockPlayer.id.toString());
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: mockPlayer.id })).toBeTruthy();
          done();
        }, 100);
      });
    });
  });

  describe('#getAll()', () => {
    it('should retrieve all players skills', async () => {
      const ret = await service.getAll();
      expect(ret.length).toBe(1);
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should retrieve player skill', async () => {
      const ret = await service.getPlayerSkill(mockPlayer._id);
      expect(ret.toObject()).toEqual(mockPlayerSkill.toObject());
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const ret = await service.setPlayerSkill(mockPlayer.id, new Map([['soldier', 2]]));
      expect(ret.toObject()).toMatchObject({
        skill: new Map([['soldier', 2]]),
      });
    });

    it('should fail if there is no such player', async () => {
      await expect(service.setPlayerSkill(new ObjectId(), new Map([['scout', 1]]))).rejects.toThrowError('no such player');
    });

    it('should notify admins on discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifySkillChange');
      await service.setPlayerSkill(mockPlayer.id, new Map([['soldier', 2]]));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#exportPlayerSkills()', () => {
    describe('with players in the database', () => {
      it('should save all players\' skill to a csv file', async () => {
        const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
        await service.exportPlayerSkills();
        expect(spy).toHaveBeenCalledWith(
          expect.stringMatching(/^player-skills-.+\.csv$/),
          `etf2lProfileId,soldier\n${mockPlayer.etf2lProfileId},4`,
        );
      });
    });
  });

  describe('#importPlayerSkills()', () => {
    it.todo('should fail when the file name is empty');
    it.todo('should fail if the given file does not exist');

    describe('when the player exists', () => {
      it.todo('should import player skills');
    });

    describe('when the player does not exist', () => {
      it.todo('should import player skills into the future skills');
    });
  });
});
