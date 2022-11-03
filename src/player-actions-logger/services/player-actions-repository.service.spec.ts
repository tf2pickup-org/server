import { Test, TestingModule } from '@nestjs/testing';
import { PlayerActionsRepositoryService } from './player-actions-repository.service';

describe('PlayerActionsRepositoryService', () => {
  let service: PlayerActionsRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerActionsRepositoryService],
    }).compile();

    service = module.get<PlayerActionsRepositoryService>(PlayerActionsRepositoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
