import { Player } from '@/players/models/player';
import {
  DenyReason,
  PlayerDeniedError,
} from '@/shared/errors/player-denied.error';
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

    const player = new Player();
    player.name = 'FAKE_PLAYER_NAME';

    const filter = new AllExceptionsFilter();
    filter.catch(
      new PlayerDeniedError(player, DenyReason.playerIsBanned),
      host as any,
    );
    expect(socket.emit).toHaveBeenCalledWith('exception', {
      message: expect.any(String),
    });
  });
});
