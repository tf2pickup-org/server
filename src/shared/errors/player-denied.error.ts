import { Player } from '@/players/models/player';

export enum DenyReason {
  playerHasNotAcceptedRules = 'player has not accepted rules',
  noSkillAssigned = 'player has no skill assigned',
  playerIsBanned = 'player is banned',
  playerIsInvolvedInGame = 'player is involved in a game',
}

export class PlayerDeniedError extends Error {
  constructor(
    public readonly player: Player,
    public readonly reason: DenyReason,
  ) {
    super(`player ${player.name} denied from joining the queue (${reason})`);
  }
}
