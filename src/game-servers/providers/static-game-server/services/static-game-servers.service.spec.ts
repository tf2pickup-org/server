import { Test, TestingModule } from '@nestjs/testing';
import { StaticGameServersService } from './static-game-servers.service';

describe('StaticGameServersService', () => {
  let service: StaticGameServersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaticGameServersService],
    }).compile();

    service = module.get<StaticGameServersService>(StaticGameServersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
