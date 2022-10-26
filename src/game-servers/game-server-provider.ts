import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerDetails } from './interfaces/game-server-details';
import { GameServerOption } from './interfaces/game-server-option';

export enum GameServerReleaseReason {
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
   * Book the given gameserver.
   */
  takeGameServer: (params: {
    gameServerId: string;
    gameId: string;
  }) => GameServerDetails | Promise<GameServerDetails>;

  /**
   * Called whenever a gameserver is freed.
   */
  releaseGameServer: (params: {
    gameServerId: string;
    gameId: string;
    reason: GameServerReleaseReason;
  }) => void | Promise<void>;

  /**
   * Find first gameserver that can be used for a game.
   */
  takeFirstFreeGameServer: (params: {
    gameId: string;
  }) => GameServerDetails | Promise<GameServerDetails>;

  /**
   * Get direct access to the given gameserver.
   * This method will be called only for assigned (taken) gameservers.
   */
  getControls: (gameServerId: string) => Promise<GameServerControls>;
}
