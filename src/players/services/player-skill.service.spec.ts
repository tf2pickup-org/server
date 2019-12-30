import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken } from 'nestjs-typegoose';
import { PlayersService } from './players.service';

const skill = {
  player: 'FAKE_ID',
  skill: {
    scout: 3,
    medic: 2,
  },
  save: () => null,
};

const playerSkillModel = {
  find: (criteria: any) => new Promise(resolve => resolve([])),
  findOne: (criteria: any) => skill,
};

class PlayersServiceStub {
  getById(id: string) { return null; }
}

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSkillService,
        { provide: getModelToken('PlayerSkill'), useValue: playerSkillModel },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAll()', () => {
    it('should retrieve all players skills', async () => {
      const spy = spyOn(playerSkillModel, 'find').and.callThrough();
      await service.getAll();
      expect(spy).toHaveBeenCalledWith({ });
    });
  });

  describe('#getPlayerSkill()', () => {
    it('should retrieve player skill', async () => {
      const spy = spyOn(playerSkillModel, 'findOne').and.callThrough();
      const ret = await service.getPlayerSkill('FAKE_ID');
      expect(spy).toHaveBeenCalledWith({ player: 'FAKE_ID' });
      expect(ret).toEqual(skill as any);
    });
  });

  describe('#setPlayerSkill()', () => {
    it('should set player skill', async () => {
      const spyFindOne = spyOn(playerSkillModel, 'findOne').and.callThrough();
      const spySave = spyOn(skill, 'save').and.returnValue(skill);
      const ret = await service.setPlayerSkill('FAKE_ID', { scout: 2 });
      expect(spyFindOne).toHaveBeenCalledWith({ player: 'FAKE_ID' });
      expect(spySave).toHaveBeenCalled();
      expect(ret.skill).toEqual(new Map([['scout', 2]]));
    });

    it('should fail if there is no such player', async () => {
      spyOn(playerSkillModel, 'findOne').and.returnValue(null);
      expectAsync(service.setPlayerSkill('FAKE_ID', { scout: 1 })).toBeRejectedWithError('no such player');
    });
  });
});
