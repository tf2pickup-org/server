import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { QueueSlot } from './queue/queue-slot';
import { QueueState } from './queue/queue-state';

@Injectable()
export class Events {

  readonly playerJoinsQueue = new Subject<{ playerId: string }>();

  readonly playerLeavesQueue = new Subject<{ playerId: string, reason: 'manual' | 'kicked' }>();

  readonly queueSlotsChange = new Subject<{ slots: QueueSlot[] }>();

  readonly queueStateChange = new Subject<{ state: QueueState }>();

}
