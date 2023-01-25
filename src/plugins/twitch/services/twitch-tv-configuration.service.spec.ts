import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Test, TestingModule } from '@nestjs/testing';
import { TwitchTvConfigurationService } from './twitch-tv-configuration.service';

jest.mock('@/configuration/services/configuration.service');

describe('TwitchTvConfigurationService', () => {
  let service: TwitchTvConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwitchTvConfigurationService, ConfigurationService],
    }).compile();

    service = module.get<TwitchTvConfigurationService>(
      TwitchTvConfigurationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
