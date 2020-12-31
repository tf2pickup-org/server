type LeaveReason = 'manual' | 'kicked';

/**
 * Emitted when a player leaves the queue.
 */
export class PlayerLeftEvent {

  constructor(
    public readonly playerId: string,
    public readonly reason: LeaveReason,
  ) { }

}
