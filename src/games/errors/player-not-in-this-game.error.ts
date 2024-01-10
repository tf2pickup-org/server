import { PlayerId } from '@/players/types/player-id';
import { GameId } from '../game-id';

export class PlayerNotInThisGameError extends Error {
  constructor(
    public readonly playerId: PlayerId,
    public readonly gameId: GameId,
  ) {
    super(
      `player (id=${playerId.toString()}) does not take part in the game (id=${gameId.toString()})`,
    );
  }
}
