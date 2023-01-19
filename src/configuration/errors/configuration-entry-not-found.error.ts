export class ConfigurationEntryNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`configuration entry ${key} not found`);
  }
}
