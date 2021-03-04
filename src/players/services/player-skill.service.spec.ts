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
import { Player } from '../models/player';
import { DiscordService } from '@/discord/services/discord.service';
import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

jest.mock('./players.service');
jest.mock('./future-player-skill.service');
jest.mock('./etf2l-profile.service');

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'soldier' },
    ],
  };
}

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
};

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;
  let mongod: MongoMemoryServer;
  let playerSkillModel: ReturnModelType<typeof PlayerSkill>;
  let mockPlayer: DocumentType<Player>;
  let mockPlayerSkill: DocumentType<PlayerSkill>;
  let playersService: PlayersService;
  let futurePlayerSkillService: FuturePlayerSkillService;
  let events: Events;

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
        DiscordService,
        { provide: Environment, useValue: environment },
        Events,
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
    playerSkillModel = module.get(getModelToken('PlayerSkill'));
    playersService = module.get(PlayersService);
    futurePlayerSkillService = module.get(FuturePlayerSkillService);
    events = module.get(Events);

    service.onModuleInit();
  });

  beforeEach(async () => {
    // @ts-expect-error
    mockPlayer = await playersService._createOne();
    mockPlayerSkill = await playerSkillModel.create({
      player: mockPlayer._id,
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
      let newPlayer: DocumentType<Player>;

      beforeEach(async () => {
        // @ts-expect-error
        newPlayer = await playersService._createOne();
      });

      it('should not update player\'s skill', async () => new Promise<void>(resolve => {
        // @ts-expect-error
        playersService.playerRegistered.next(newPlayer.id.toString());
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: newPlayer.id })).toBe(null);
          resolve();
        }, 100);
      }));
    });

    describe('when there is future skill for the given player', () => {
      beforeEach(() => {
        // @ts-expect-error
        futurePlayerSkillService.findSkill = () => Promise.resolve({ steamId: mockPlayer.steamId, skill: new Map([['soldier', 2]]) });
      });

      it('should update player\'s skill', async () => new Promise<void>(resolve => {
        // @ts-expect-error
        playersService.playerRegistered.next(mockPlayer.id.toString());
        setTimeout(async () => {
          expect(await playerSkillModel.findOne({ player: mockPlayer.id })).toBeTruthy();
          resolve();
        }, 100);
      }));
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
      const ret = await service.getPlayerSkill(mockPlayer.id);
      expect(ret.size).toEqual(1);
      expect(ret.get(Tf2ClassName.soldier)).toEqual(4);
    });

    describe('when the given player has no skill assigned', () => {
      it('should return null', async () => {
        const ret = await service.getPlayerSkill(new ObjectId().toString());
        expect(ret).toBeUndefined();
      });
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should update player skill', async () => {
      const ret = await service.setPlayerSkill(mockPlayer.id, new Map([[Tf2ClassName.soldier, 2]]));
      expect(ret.size).toEqual(1);
      expect(ret.get(Tf2ClassName.soldier)).toEqual(2);
    });

    it('should emit the playerSkillChanged event', async () => new Promise<void>(resolve => {
      events.playerSkillChanged.subscribe(({ playerId, oldSkill, newSkill, adminId }) => {
        expect(playerId).toEqual(mockPlayer.id);
        expect(oldSkill.get(Tf2ClassName.soldier)).toEqual(4);
        expect(newSkill.get(Tf2ClassName.soldier)).toEqual(2);
        expect(adminId).toBeUndefined();
        resolve();
      });

      service.setPlayerSkill(mockPlayer.id, new Map([[Tf2ClassName.soldier, 2]]));
    }));

    describe('when there is no such player', () => {
      it('should fail', async () => {
        await expect(service.setPlayerSkill(new ObjectId().toString(), new Map([[Tf2ClassName.scout, 1]]))).rejects.toThrowError('no such player');
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
