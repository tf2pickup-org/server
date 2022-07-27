import { Test, TestingModule } from '@nestjs/testing';
import { LogCollectorService } from './log-collector.service';

describe('LogCollectorService', () => {
  let service: LogCollectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogCollectorService],
    }).compile();

    service = module.get<LogCollectorService>(LogCollectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
