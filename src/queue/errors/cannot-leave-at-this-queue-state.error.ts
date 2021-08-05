export class CannotLeaveAtThisQueueStateError extends Error {
  constructor(public queueState: string) {
    super(`cannot leave the queue at this state (${queueState})`);
  }
}
