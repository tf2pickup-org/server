import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfApiService } from './serveme-tf-api.service';

describe('ServemeTfApiService', () => {
  let service: ServemeTfApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServemeTfApiService],
    }).compile();

    service = module.get<ServemeTfApiService>(ServemeTfApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
