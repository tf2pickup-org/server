export class NoEtf2lAccountError extends Error {
  constructor(steamId: string) {
    super(`no ETF2L account for steamId ${steamId}`);
  }
}
