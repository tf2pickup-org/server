import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayersService } from './players.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { PlayerSkill } from '../models/player-skill';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';

const skill = {
  player: 'FAKE_ID',
  skill: {
    scout: 3,
    medic: 2,
  },
  save: () => null,
};

class PlayersServiceStub {
  getById(id: string) { return null; }
}

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;
  let mongod: MongoMemoryServer;
  let playerSkillModel: ReturnModelType<typeof PlayerSkill>;
  let playerSkill: DocumentType<PlayerSkill>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ PlayerSkill ]),
      ],
      providers: [
        PlayerSkillService,
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
    playerSkillModel = module.get(getModelToken('PlayerSkill'));
  });

  beforeEach(async () => {
    playerSkill = await playerSkillModel.create({
      player: new ObjectId().toString(),
      skill: new Map([['soldier', 4]]),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAll()', () => {
    it('should retrieve all players skills', async () => {
      const ret = await service.getAll();
      expect(ret.map(r => r.toJSON())).toEqual([ playerSkill ]);
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should retrieve player skill', async () => {
      const ret = await service.getPlayerSkill('FAKE_ID');
      expect(ret).toEqual(playerSkill);
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const spyFindOne = jest.spyOn(playerSkillModel, 'findOne');
      const spySave = jest.spyOn(skill, 'save').mockResolvedValue(skill);
      const ret = await service.setPlayerSkill('FAKE_ID', { scout: 2 });
      expect(spyFindOne).toHaveBeenCalledWith({ player: 'FAKE_ID' });
      expect(spySave).toHaveBeenCalled();
      expect(ret.skill).toEqual(new Map([['scout', 2]]));
    });

    it('should fail if there is no such player', async () => {
      jest.spyOn(playerSkillModel, 'findOne').mockResolvedValue(null as never);
      await expect(service.setPlayerSkill('FAKE_ID', { scout: 1 })).rejects.toThrowError('no such player');
    });
  });
});
