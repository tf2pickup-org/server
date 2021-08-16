export class Tf2InGameHoursVerificationError extends Error {
  constructor(public verificationErrorMessage: string) {
    super(`cannot verify in-game hours for TF2 (${verificationErrorMessage})`);
  }
}
