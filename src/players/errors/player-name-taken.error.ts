type Service = 'Steam' | 'ETF2L';

export class PlayerNameTakenError extends Error {
  constructor(name: string, readonly service: Service) {
    super(`${service} name '${name}' is already taken`);
  }
}
