export class CannotJoinAtThisQueueStateError extends Error {
  constructor(public queueState: string) {
    super(`cannot join the queue at this state (${queueState})`);
  }
}
