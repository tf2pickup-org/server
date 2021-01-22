import { Game } from '@/games/models/game';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { Map } from '@/queue/models/map';
import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MapVoteResult } from '../queue/map-vote-result';
import { QueueSlot } from '../queue/queue-slot';
import { QueueState } from '../queue/queue-state';
import { Friendship } from '../queue/services/friends.service';

/**
 * List of all events that occur in the application.
 */
@Injectable()
export class Events {

  private logger = new Logger(Events.name);

  readonly playerRegisters = new Subject<{ player: Player }>();
  readonly playerDisconnects = new Subject<{ playerId: string }>();
  readonly playerBanAdded = new Subject<{ ban: PlayerBan }>();
  readonly playerBanRevoked = new Subject<{ ban: PlayerBan }>();

  readonly playerJoinsQueue = new Subject<{ playerId: string }>();
  readonly playerLeavesQueue = new Subject<{ playerId: string, reason: 'manual' | 'kicked' }>();
  readonly queueSlotsChange = new Subject<{ slots: QueueSlot[] }>();
  readonly queueStateChange = new Subject<{ state: QueueState }>();
  readonly queueFriendshipsChange = new Subject<{ friendships: Friendship[] }>();
  readonly mapVotesChange = new Subject<{ results: MapVoteResult[] }>();

  readonly mapPoolChange = new Subject<{ maps: Map[] }>();

  readonly gameCreated = new Subject<{ game: Game }>();
  readonly gameChanges = new Subject<{ game: Game }>();
  readonly substituteRequestsChange = new Subject<void>();

  constructor() {
    for (const eventName in this) {
      const prop = this[eventName] as any;
      if (prop instanceof Subject) {
        prop.subscribe((...args) => this.logger.debug(`${eventName}: ${JSON.stringify(args)}`));
      }
    }
  }

}
