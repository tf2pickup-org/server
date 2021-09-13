export class InsufficientTf2InGameHoursError extends Error {
  constructor(requiredHours: number, reportedHours: number) {
    super(
      `insufficient TF2 in-game hours (reported: ${reportedHours}, required: ${requiredHours})`,
    );
  }
}
