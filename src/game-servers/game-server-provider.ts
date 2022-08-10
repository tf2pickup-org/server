import { GameServerControls } from './interfaces/game-server-controls';
import { GameServerOption } from './interfaces/game-server-option';

export interface GameServerProvider {
  readonly gameServerProviderName: string;
  readonly priority?: number;
  getControls: (id: string) => Promise<GameServerControls>;
  findFirstFreeGameServer: () => Promise<GameServerOption>;
}
