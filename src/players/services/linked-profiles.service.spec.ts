import { Test, TestingModule } from '@nestjs/testing';
import { LinkedProfilesService } from './linked-profiles.service';

describe('LinkedProfilesService', () => {
  let service: LinkedProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedProfilesService],
    }).compile();

    service = module.get<LinkedProfilesService>(LinkedProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
