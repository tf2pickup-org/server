import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueConfigurationService } from './queue-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('QueueConfigurationService', () => {
  let service: QueueConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueConfigurationService, ConfigurationService],
    }).compile();

    service = module.get<QueueConfigurationService>(QueueConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
