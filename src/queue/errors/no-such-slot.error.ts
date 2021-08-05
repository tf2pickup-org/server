export class NoSuchSlotError extends Error {
  constructor(public slotId: number) {
    super(`no such slot (${slotId})`);
  }
}
