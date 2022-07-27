import { Test, TestingModule } from '@nestjs/testing';
import { LogsTfApiService } from './logs-tf-api.service';

describe('LogsTfApiService', () => {
  let service: LogsTfApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogsTfApiService],
    }).compile();

    service = module.get<LogsTfApiService>(LogsTfApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
