import { Test, TestingModule } from '@nestjs/testing';
import { GamesConfigurationService } from './games-configuration.service';

describe('GamesConfigurationService', () => {
  let service: GamesConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamesConfigurationService],
    }).compile();

    service = module.get<GamesConfigurationService>(GamesConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
