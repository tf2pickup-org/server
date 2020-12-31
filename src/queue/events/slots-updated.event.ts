import { QueueSlot } from '../queue-slot';

export class SlotsUpdatedEvent {

  constructor(
    public readonly slots: QueueSlot[],
  ) { }

}
