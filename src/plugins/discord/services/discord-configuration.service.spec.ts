import { Test, TestingModule } from '@nestjs/testing';
import { DiscordConfigurationService } from './discord-configuration.service';

describe('DiscordConfigurationService', () => {
  let service: DiscordConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordConfigurationService],
    }).compile();

    service = module.get<DiscordConfigurationService>(DiscordConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
