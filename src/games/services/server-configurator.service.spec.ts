import { Test, TestingModule } from '@nestjs/testing';
import { ServerConfiguratorService } from './server-configurator.service';

describe('ServerConfiguratorService', () => {
  let service: ServerConfiguratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerConfiguratorService],
    }).compile();

    service = module.get<ServerConfiguratorService>(ServerConfiguratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
