import { Test, TestingModule } from '@nestjs/testing';
import { QueueConfigService } from './queue-config.service';
import { Environment } from '@/environment/environment';

class EnvironmentStub {
  queueConfig = '6v6';
}

describe('QueueConfigService', () => {
  let service: QueueConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueConfigService,
        { provide: Environment, useClass: EnvironmentStub },
      ],
    }).compile();

    service = module.get<QueueConfigService>(QueueConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
