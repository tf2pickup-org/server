import { Test, TestingModule } from '@nestjs/testing';
import { PlayerActionLoggerService } from './player-action-logger.service';

describe('PlayerActionLoggerService', () => {
  let service: PlayerActionLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerActionLoggerService],
    }).compile();

    service = module.get<PlayerActionLoggerService>(PlayerActionLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
