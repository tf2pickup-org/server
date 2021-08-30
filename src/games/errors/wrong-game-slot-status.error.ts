import { SlotStatus } from '../models/slot-status';

export class WrongGameSlotStatusError extends Error {
  constructor(gameId: string, playerId: string, slotStatus: SlotStatus) {
    super(
      `wrong game slot status (gameId=${gameId}, playerId=${playerId}, slotStatus=${slotStatus})`,
    );
  }
}
