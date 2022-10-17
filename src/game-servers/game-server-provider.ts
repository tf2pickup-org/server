import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerDetails } from './interfaces/game-server-details';
import { GameServerOption } from './interfaces/game-server-option';

export enum GameServerUnassignReason {
  Manual,
  GameEnded,
}

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
   * Get direct access to the given gameserver.
   * This method will be called only for assigned (taken) gameservers.
   */
  getControls: (gameServerId: string) => Promise<GameServerControls>;

  /**
   * Book the given gameserver.
   */
  takeGameServer: (params: {
    gameServerId: string;
    gameId: string;
  }) => Promise<GameServerDetails>;

  /**
   * Called whenever a gameserver is freed.
   */
  releaseGameServer: (params: {
    gameServerId: string;
    gameId: string;
    reason: GameServerUnassignReason;
  }) => void | Promise<void>;
}
