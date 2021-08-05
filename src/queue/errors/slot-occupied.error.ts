export class SlotOccupiedError extends Error {
  constructor(public slotId: number) {
    super(`slot (${slotId}) already occupied`);
  }
}
