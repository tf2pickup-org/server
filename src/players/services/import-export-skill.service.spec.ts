import { QueueConfigService } from '@/queue-config/services/queue-config.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSkillRecordMalformedError } from '../errors/player-skill-record-malformed.error';
import { FuturePlayerSkillService } from './future-player-skill.service';
import { ImportExportSkillService } from './import-export-skill.service';

jest.mock('./future-player-skill.service');
jest.mock('@/queue-config/services/queue-config.service', () => ({
  QueueConfigService: jest.fn().mockImplementation(() => ({
    queueConfig: {
      teamCount: 2,
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

describe('ImportExportSkillService', () => {
  let service: ImportExportSkillService;
  let futurePlayerSkillService: jest.Mocked<FuturePlayerSkillService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportExportSkillService,
        FuturePlayerSkillService,
        QueueConfigService,
      ],
    }).compile();

    service = module.get<ImportExportSkillService>(ImportExportSkillService);
    futurePlayerSkillService = module.get(FuturePlayerSkillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#importRawSkillRecord()', () => {
    describe('if the record is malformed', () => {
      it('should throw', async () => {
        await expect(
          service.importRawSkillRecord(['76561198074409147', '2', '3']),
        ).rejects.toThrow(PlayerSkillRecordMalformedError);
      });
    });

    it('should register future skill', async () => {
      await service.importRawSkillRecord([
        '76561198074409147',
        '1',
        '2',
        '3',
        '4',
      ]);
      expect(futurePlayerSkillService.registerSkill).toHaveBeenCalledWith(
        '76561198074409147',
        new Map([
          [Tf2ClassName.scout, 1],
          [Tf2ClassName.soldier, 2],
          [Tf2ClassName.demoman, 3],
          [Tf2ClassName.medic, 4],
        ]),
      );
    });
  });
});
