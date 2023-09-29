import { Test, TestingModule } from '@nestjs/testing';
import { QueuePromptsService } from './queue-prompts.service';

describe('QueuePromptsService', () => {
  let service: QueuePromptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueuePromptsService],
    }).compile();

    service = module.get<QueuePromptsService>(QueuePromptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
