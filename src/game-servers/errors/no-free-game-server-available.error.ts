export class NoFreeGameServerAvailableError extends Error {
  constructor() {
    super('no free game server available');
  }
}
