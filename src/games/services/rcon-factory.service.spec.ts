import { Test, TestingModule } from '@nestjs/testing';
import { RconFactoryService } from './rcon-factory.service';

describe('RconFactoryService', () => {
  let service: RconFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RconFactoryService],
    }).compile();

    service = module.get<RconFactoryService>(RconFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
