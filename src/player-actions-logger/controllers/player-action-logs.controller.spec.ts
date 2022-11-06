import { Test, TestingModule } from '@nestjs/testing';
import { PlayerActionsRepositoryService } from '../services/player-actions-repository.service';
import { PlayerActionLogsController } from './player-action-logs.controller';

jest.mock('../services/player-actions-repository.service');

describe('PlayerActionLogsController', () => {
  let controller: PlayerActionLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerActionLogsController, PlayerActionsRepositoryService],
    }).compile();

    controller = module.get<PlayerActionLogsController>(
      PlayerActionLogsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
