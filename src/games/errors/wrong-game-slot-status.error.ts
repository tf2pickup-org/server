import { PlayerId } from '@/players/types/player-id';
import { GameId } from '../game-id';
import { SlotStatus } from '../models/slot-status';

export class WrongGameSlotStatusError extends Error {
  constructor(gameId: GameId, playerId: PlayerId, slotStatus: SlotStatus) {
    super(
      `wrong game slot status (gameId=${gameId}, playerId=${playerId}, slotStatus=${slotStatus})`,
    );
  }
}
