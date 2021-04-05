export class InvalidTokenError extends Error {
  constructor() {
    super('invalid token');
  }
}
