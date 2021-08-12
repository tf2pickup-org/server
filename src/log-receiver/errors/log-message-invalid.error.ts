export class LogMessageInvalidError extends Error {
  constructor(public reason: string) {
    super(`log message invalid (${reason})`);
  }
}
