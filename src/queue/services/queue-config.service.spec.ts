import { Test, TestingModule } from '@nestjs/testing';
import { QueueConfigService } from './queue-config.service';
import { ConfigService } from '@/config/config.service';

class ConfigServiceStub {
  queueConfig = '6v6';
}

describe('QueueConfigService', () => {
  let service: QueueConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueConfigService,
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    }).compile();

    service = module.get<QueueConfigService>(QueueConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
