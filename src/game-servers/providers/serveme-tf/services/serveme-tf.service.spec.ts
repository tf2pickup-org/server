import { Test, TestingModule } from '@nestjs/testing';
import { ServemeTfService } from './serveme-tf.service';

describe('ServemeTfService', () => {
  let service: ServemeTfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServemeTfService],
    }).compile();

    service = module.get<ServemeTfService>(ServemeTfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
