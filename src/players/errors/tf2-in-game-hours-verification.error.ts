export class Tf2InGameHoursVerificationError extends Error {
  constructor(public steamId: string, public verificationErrorMessage: string) {
    super(
      `cannot verify in-game hours for TF2 (steamId: ${steamId}, error: ${verificationErrorMessage})`,
    );
  }
}
