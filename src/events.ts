import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MapVoteResult } from './queue/map-vote-result';
import { QueueSlot } from './queue/queue-slot';
import { QueueState } from './queue/queue-state';
import { Friendship } from './queue/services/friends.service';

/**
 * List of all events that occur in the application.
 */
@Injectable()
export class Events {

  readonly playerJoinsQueue = new Subject<{ playerId: string }>();
  readonly playerLeavesQueue = new Subject<{ playerId: string, reason: 'manual' | 'kicked' }>();
  readonly queueSlotsChange = new Subject<{ slots: QueueSlot[] }>();
  readonly queueStateChange = new Subject<{ state: QueueState }>();
  readonly queueFriendshipsChange = new Subject<{ friendships: Friendship[] }>();
  readonly mapVotesChange = new Subject<{ results: MapVoteResult[] }>();

}
