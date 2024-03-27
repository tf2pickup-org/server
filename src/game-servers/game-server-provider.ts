import { GameId } from '@/games/types/game-id';
import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerDetails } from './interfaces/game-server-details';
import { GameServerOption } from './interfaces/game-server-option';

export enum GameServerReleaseReason {
  Manual,
  GameEnded,
  GameInterrupted,
}

export interface TakeFirstFreeGameServerParams {
  gameId: GameId;
  map: string;
}

export interface TakeGameServerParams extends TakeFirstFreeGameServerParams {
  gameServerId: string;
}

export interface ReleaseGameServerParams {
  gameServerId: string;
  gameId: GameId;
  reason: GameServerReleaseReason;
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
  takeGameServer: (
    params: TakeGameServerParams,
  ) => GameServerDetails | Promise<GameServerDetails>;

  /**
   * Called whenever a gameserver is freed.
   */
  releaseGameServer: (params: ReleaseGameServerParams) => void | Promise<void>;

  /**
   * Find first gameserver that can be used for a game.
   */
  takeFirstFreeGameServer: (
    params: TakeFirstFreeGameServerParams,
  ) => GameServerDetails | Promise<GameServerDetails>;

  /**
   * Get direct access to the given gameserver.
   * This method will be called only for assigned (taken) gameservers.
   */
  getControls: (gameServerId: string) => Promise<GameServerControls>;
}
