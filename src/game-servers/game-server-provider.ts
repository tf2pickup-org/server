import { GameServer } from './models/game-server';

type GameServerConstructor = {
  new (...args: any[]): GameServer;
};

export interface GameServerProvider {
  readonly gameServerProviderName: string;
  readonly implementingClass: GameServerConstructor;
  readonly priority?: number;
  findFirstFreeGameServer: () => Promise<GameServer>;
}
