import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { GameConfigsService } from './game-configs.service';

describe('GameConfigsService', () => {
  let service: GameConfigsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameConfigsService,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
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
        },
      ],
    }).compile();

    service = module.get<GameConfigsService>(GameConfigsService);
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#compileConfig()', () => {
    it('should skip empty lines', () => {
      const lines = service.compileConfig();
      expect(lines.includes('')).toBe(false);
    });

    it('should resolve variables', () => {
      const lines = service.compileConfig();
      expect(lines.includes('mp_tournament_readymode_team_size 6')).toBe(true);
    });
  });
});
