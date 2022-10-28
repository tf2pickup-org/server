import { Test, TestingModule } from '@nestjs/testing';
import { QueueConfigService } from './queue-config.service';

describe('QueueConfigService', () => {
  describe('with a valid config', () => {
    const config = `{
      "teamCount": 2,
      "classes": [
        {
          "name": "soldier",
          "count": 1
        }
      ],
      "maps": [
        {
          "name": "cp_process_final",
          "configName": "5cp"
        },
        {
          "name": "cp_gullywash_final1",
          "configName": "5cp"
        }
      ],
      "configs": {
        "5cp": "etf2l_6v6_5cp"
      }
    }`;

    let service: QueueConfigService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QueueConfigService,
          { provide: 'QUEUE_CONFIG_JSON', useValue: config },
        ],
      }).compile();

      service = module.get<QueueConfigService>(QueueConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
