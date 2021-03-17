import { Test, TestingModule } from '@nestjs/testing';
import { GameServerDiagnosticsService } from './game-server-diagnostics.service';

describe('GameServerDiagnosticsService', () => {
  let service: GameServerDiagnosticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameServerDiagnosticsService],
    }).compile();

    service = module.get<GameServerDiagnosticsService>(GameServerDiagnosticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
