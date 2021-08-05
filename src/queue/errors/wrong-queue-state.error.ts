export class WrongQueueStateError extends Error {
  constructor(public queueState: string) {
    super(`wrong queue state (${queueState})`);
  }
}
