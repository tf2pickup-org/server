import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayersConfigurationService } from './players-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('PlayersConfigurationService', () => {
  let service: PlayersConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersConfigurationService, ConfigurationService],
    }).compile();

    service = module.get<PlayersConfigurationService>(
      PlayersConfigurationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
