import { Test, TestingModule } from '@nestjs/testing';
import { QueueConfigurationService } from './queue-configuration.service';

describe('QueueConfigurationService', () => {
  let service: QueueConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueConfigurationService],
    }).compile();

    service = module.get<QueueConfigurationService>(QueueConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
