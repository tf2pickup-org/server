import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerOption } from './interfaces/game-server-option';

export interface GameServerProvider {
  readonly gameServerProviderName: string;
  readonly priority?: number;
  getControls: (gameServerId: string) => Promise<GameServerControls>;
  findFirstFreeGameServer: () => Promise<GameServerOption>;
  findGameServerOptions: () => Promise<GameServerOption[]>;

  onGameServerAssigned?: (params: {
    gameServerId: string;
    gameId: string;
  }) => void | Promise<void>;

  onGameServerUnassigned?: (params: {
    gameServerId: string;
    gameId: string;
  }) => void | Promise<void>;
}
