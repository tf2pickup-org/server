import { Test, TestingModule } from '@nestjs/testing';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { GameServerDiagnosticsController } from './game-server-diagnostics.controller';

jest.mock('../services/game-server-diagnostics.service', () => ({
  GameServerDiagnosticsService: jest.fn().mockImplementation(() => ({
    getDiagnosticRunById: id => Promise.resolve({ id }),
  })),
}));

describe('GameServerDiagnosticsController', () => {
  let controller: GameServerDiagnosticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameServerDiagnosticsController],
      providers: [
        GameServerDiagnosticsService,
      ],
    }).compile();

    controller = module.get<GameServerDiagnosticsController>(GameServerDiagnosticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getDiagnosticRun()', () => {
    it('should return the given diagnostic run', async () => {
      const ret = await controller.getDiagnosticRun('FAKE_ID');
      expect(ret).toEqual({ id: 'FAKE_ID' });
    });
  })
});
