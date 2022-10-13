import { Test, TestingModule } from '@nestjs/testing';
import { GameServerAssignerService } from './game-server-assigner.service';

describe('GameServerAssignerService', () => {
  let service: GameServerAssignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameServerAssignerService],
    }).compile();

    service = module.get<GameServerAssignerService>(GameServerAssignerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
