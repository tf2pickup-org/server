import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillService } from './player-skill.service';
import { getModelToken } from 'nestjs-typegoose';
import { QueueConfigService } from '@/queue/services/queue-config.service';

const playerSkillModel = {

};

class QueueConfigServiceStub {

}

describe('PlayerSkillService', () => {
  let service: PlayerSkillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerSkillService,
        { provide: getModelToken('PlayerSkill'), useValue: playerSkillModel },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
      ],
    }).compile();

    service = module.get<PlayerSkillService>(PlayerSkillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
