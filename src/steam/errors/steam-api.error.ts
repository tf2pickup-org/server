export class SteamApiError extends Error {
  constructor(public readonly message: string) {
    super(`steam API error (error: ${message})`);
  }
}
