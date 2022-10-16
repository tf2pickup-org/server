import { Test, TestingModule } from '@nestjs/testing';
import { ServerCleanupService } from './server-cleanup.service';

describe('ServerCleanupService', () => {
  let service: ServerCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerCleanupService],
    }).compile();

    service = module.get<ServerCleanupService>(ServerCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
