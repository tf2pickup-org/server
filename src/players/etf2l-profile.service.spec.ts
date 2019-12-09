import { Test, TestingModule } from '@nestjs/testing';
import { Etf2lProfileService } from './etf2l-profile.service';

describe('Etf2lProfileService', () => {
  let service: Etf2lProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Etf2lProfileService],
    }).compile();

    service = module.get<Etf2lProfileService>(Etf2lProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
