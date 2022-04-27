import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { GameConfigsService } from './game-configs.service';

jest.mock('@/queue/services/queue-config.service', () => ({
  QueueConfigService: jest.fn().mockImplementation(() => ({
    queueConfig: {
      teamSize: 2,
      classes: [
        {
          name: Tf2ClassName.scout,
          count: 2,
        },
        {
          name: Tf2ClassName.soldier,
          count: 2,
        },
        {
          name: Tf2ClassName.demoman,
          count: 1,
        },
        {
          name: Tf2ClassName.medic,
          count: 1,
        },
      ],
    },
  })),
}));

describe('GameConfigsService', () => {
  let service: GameConfigsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameConfigsService, QueueConfigService],
    }).compile();

    service = module.get<GameConfigsService>(GameConfigsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#compileConfig()', () => {
    it('should skip empty lines', async () => {
      const lines = await service.compileConfig();
      expect(lines.includes('')).toBe(false);
    });

    it('should resolve variables', async () => {
      const lines = await service.compileConfig();
      expect(lines.includes('mp_tournament_readymode_team_size 6')).toBe(true);
    });
  });
});
