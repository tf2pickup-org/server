import { Test, TestingModule } from '@nestjs/testing';
import { PlayersConfigurationService } from './players-configuration.service';

describe('PlayersConfigurationService', () => {
  let service: PlayersConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersConfigurationService],
    }).compile();

    service = module.get<PlayersConfigurationService>(PlayersConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
