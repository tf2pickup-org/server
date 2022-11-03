import { Test, TestingModule } from '@nestjs/testing';
import { PlayerActionLogsController } from './player-action-logs.controller';

describe('PlayerActionLogsController', () => {
  let controller: PlayerActionLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerActionLogsController],
    }).compile();

    controller = module.get<PlayerActionLogsController>(PlayerActionLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
