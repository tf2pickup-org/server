import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBehaviorHandlerService } from './player-behavior-handler.service';

describe('PlayerBehaviorHandlerService', () => {
  let service: PlayerBehaviorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerBehaviorHandlerService],
    }).compile();

    service = module.get<PlayerBehaviorHandlerService>(PlayerBehaviorHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
