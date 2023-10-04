import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { GamesConfigurationService } from './games-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('GamesConfigurationService', () => {
  let service: GamesConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesConfigurationService,
        ConfigurationService,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
            classes: [
              { name: 'scout', count: 2 },
              { name: 'soldier', count: 2 },
              { name: 'demoman', count: 1 },
              { name: 'medic', count: 1 },
            ],
            teamCount: 2,
          },
        },
      ],
    }).compile();

    service = module.get<GamesConfigurationService>(GamesConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
