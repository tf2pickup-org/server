import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';

describe('PlayerBansService', () => {
  let service: PlayerBansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerBansService],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
