import { Test, TestingModule } from '@nestjs/testing';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import {
  FuturePlayerSkill,
  FuturePlayerSkillDocument,
  futurePlayerSkillSchema,
} from '../models/future-player-skill';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';

describe('FuturePlayerSkillService', () => {
  let service: FuturePlayerSkillService;
  let mongod: MongoMemoryServer;
  let futurePlayerSkillModel: Model<FuturePlayerSkillDocument>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: FuturePlayerSkill.name,
            schema: futurePlayerSkillSchema,
          },
        ]),
      ],
      providers: [FuturePlayerSkillService],
    }).compile();

    service = module.get<FuturePlayerSkillService>(FuturePlayerSkillService);
    futurePlayerSkillModel = module.get(getModelToken(FuturePlayerSkill.name));
  });

  afterEach(async () => await futurePlayerSkillModel.deleteMany({}));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#registerSkill()', () => {
    const skill = new Map([[Tf2ClassName.soldier, 5]]);

    it('should insert player skill', async () => {
      await service.registerSkill('FAKE_STEAM_ID', skill);
      const doc = await futurePlayerSkillModel.findOne();
      expect(doc.toObject()).toEqual(
        expect.objectContaining({ steamId: 'FAKE_STEAM_ID', skill }),
      );
    });

    describe('when there is skill for the given player registered already', () => {
      beforeEach(async () => {
        await futurePlayerSkillModel.create({
          steamId: 'FAKE_STEAM_ID',
          skill,
        });
      });

      it('should update player skill', async () => {
        const newSkill = new Map([[Tf2ClassName.soldier, 6]]);
        await service.registerSkill('FAKE_STEAM_ID', newSkill);
        const doc = await futurePlayerSkillModel.findOne();
        expect(doc.toObject()).toEqual(
          expect.objectContaining({
            steamId: 'FAKE_STEAM_ID',
            skill: newSkill,
          }),
        );
      });
    });
  });

  describe('#findSkill()', () => {
    const skill = new Map([['soldier', 5]]);

    beforeEach(async () => {
      await futurePlayerSkillModel.create({ steamId: 'FAKE_STEAM_ID', skill });
    });

    it('should find the skill', async () => {
      const ret = await service.findSkill('FAKE_STEAM_ID');
      expect(ret.toObject()).toEqual(
        expect.objectContaining({ steamId: 'FAKE_STEAM_ID', skill }),
      );
    });

    it('should return null', async () => {
      expect(await service.findSkill('ANOTHER_FAKE_STEAM_ID')).toBe(null);
    });
  });
});
