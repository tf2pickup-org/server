export class LogsTfUploadError extends Error {
  constructor(public readonly errorMessage: string) {
    super(`logs.tf upload error: ${errorMessage}`);
  }
}
