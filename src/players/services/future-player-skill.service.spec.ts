import { Test, TestingModule } from '@nestjs/testing';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  FuturePlayerSkill,
  futurePlayerSkillSchema,
} from '../models/future-player-skill';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Player, playerSchema } from '../models/player';
import { Events } from '@/events/events';
import { PlayersService } from './players.service';

jest.mock('./players.service');

describe('FuturePlayerSkillService', () => {
  let service: FuturePlayerSkillService;
  let mongod: MongoMemoryServer;
  let futurePlayerSkillModel: Model<FuturePlayerSkill>;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
          {
            name: FuturePlayerSkill.name,
            schema: futurePlayerSkillSchema,
          },
        ]),
      ],
      providers: [FuturePlayerSkillService, Events, PlayersService],
    }).compile();

    service = module.get<FuturePlayerSkillService>(FuturePlayerSkillService);
    futurePlayerSkillModel = module.get(getModelToken(FuturePlayerSkill.name));
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await futurePlayerSkillModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#registerSkill()', () => {
    const skill = new Map([[Tf2ClassName.soldier, 5]]);

    it('should insert player skill', async () => {
      await service.registerSkill('FAKE_STEAM_ID', skill);
      const doc = await futurePlayerSkillModel.findOne().orFail();
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
        const doc = await futurePlayerSkillModel.findOne().orFail();
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
      expect(ret).toMatchObject({ steamId: 'FAKE_STEAM_ID', skill });
    });

    it('should throw', async () => {
      await expect(
        service.findSkill('ANOTHER_FAKE_STEAM_ID'),
      ).rejects.toThrow();
    });
  });
});
