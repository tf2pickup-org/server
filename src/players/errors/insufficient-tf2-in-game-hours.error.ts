export class InsufficientTf2InGameHoursError extends Error {
  constructor(
    public steamId: string,
    public requiredHours: number,
    public reportedHours: number,
  ) {
    super(
      `insufficient TF2 in-game hours (steamId: ${steamId}, reported: ${reportedHours}, required: ${requiredHours})`,
    );
  }
}
