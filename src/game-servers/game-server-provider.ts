import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerOption } from './interfaces/game-server-option';

export interface GameServerProvider {
  readonly gameServerProviderName: string;
  readonly priority?: number;

  /**
   * Fetch all gameserver options for this provider.
   */
  findGameServerOptions: () => Promise<GameServerOption[]>;

  /**
   * Find first gameserver that can be used for a game.
   */
  findFirstFreeGameServer: () => Promise<GameServerOption>;

  /**
   * Give full option info for the given gameserver.
   */
  getGameServerOption: (gameServerId: string) => Promise<GameServerOption>;

  /**
   * Get direct access to the given gameserver.
   * This method will be called only for assigned gameservers.
   */
  getControls: (gameServerId: string) => Promise<GameServerControls>;

  /**
   * Called whenever a gameserver gets assigned to a game.
   */
  onGameServerAssigned?: (params: {
    gameServerId: string;
    gameId: string;
  }) => void | Promise<void>;

  /**
   * Called whenever a gameserver is freed.
   */
  onGameServerUnassigned?: (params: {
    gameServerId: string;
    gameId: string;
  }) => void | Promise<void>;
}
