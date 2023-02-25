import { Test, TestingModule } from '@nestjs/testing';
import { SteamApiService } from './steam-api.service';

describe('SteamApiService', () => {
  let service: SteamApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SteamApiService],
    }).compile();

    service = module.get<SteamApiService>(SteamApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
