import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { GamesConfigurationService } from './games-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('GamesConfigurationService', () => {
  let service: GamesConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamesConfigurationService, ConfigurationService],
    }).compile();

    service = module.get<GamesConfigurationService>(GamesConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
