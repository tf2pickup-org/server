import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken } from 'nestjs-typegoose';

const playerSkillModel = {

};

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSkillService,
        { provide: getModelToken('PlayerSkill'), useValue: playerSkillModel },
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
