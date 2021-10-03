export class AccountBannedError extends Error {
  constructor(steamId: string) {
    super(`account is banned on ETF2L (steamId: ${steamId})`);
  }
}
