export class Etf2lApiError extends Error {
  constructor(public readonly url: string, public readonly message: string) {
    super(`ETF2L API error (${url}): ${message}`);
  }
}
