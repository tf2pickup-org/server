import { GameServerOption } from './interfaces/game-server-option';

export interface GameServerProvider {
  readonly gameServerProviderName: string;
  readonly priority?: number;
  findAllOptions: () => Promise<GameServerOption[]>;
  takeServer: (option: GameServerOption) => Promise<void>;
}
