import { PlayerInvolvedInGameError } from '@/queue/errors/player-involved-in-game.error';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  it('should be defined', () => {
    expect(new AllExceptionsFilter()).toBeDefined();
  });

  it('should handle any error', () => {
    const socket = {
      emit: jest.fn(),
    };

    const host = {
      switchToWs: () => ({
        getClient: jest.fn().mockImplementation(() => socket),
      }),
    };

    const filter = new AllExceptionsFilter();
    filter.catch(new PlayerInvolvedInGameError('FAKE_PLAYER_ID'), host as any);
    expect(socket.emit).toHaveBeenCalledWith('exception', {
      message: expect.any(String),
    });
  });
});
