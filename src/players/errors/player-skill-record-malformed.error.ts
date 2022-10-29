export class PlayerSkillRecordMalformedError extends Error {
  constructor(public readonly expectedSize: number) {
    super(`invalid record size (expected: ${expectedSize})`);
  }
}
