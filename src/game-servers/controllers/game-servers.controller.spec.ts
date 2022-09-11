import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';

describe('GameServersController', () => {
  let controller: GameServersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameServersController],
    }).compile();

    controller = module.get<GameServersController>(GameServersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
