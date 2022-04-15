import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

describe('ServemeTfConfigurationService', () => {
  let service: ServemeTfConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServemeTfConfigurationService],
    }).compile();

    service = module.get<ServemeTfConfigurationService>(ServemeTfConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
