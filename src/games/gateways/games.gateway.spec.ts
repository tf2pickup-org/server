import { Test, TestingModule } from '@nestjs/testing';
import { GamesGateway } from './games.gateway';

describe('GamesGateway', () => {
  let gateway: GamesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamesGateway],
    }).compile();

    gateway = module.get<GamesGateway>(GamesGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
