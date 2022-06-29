import { Injectable } from '@nestjs/common';
import { QueueService } from './queue.service';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';
import { filter } from 'rxjs/operators';
import { FriendsService } from './friends.service';
import { Events } from '@/events/events';
import { QueueState } from '../queue-state';

/**
 * Automatically launches a game once the queue is ready to play it.
 *
 * @export
 * @class AutoGameLauncherService
 */
@Injectable()
export class AutoGameLauncherService {
  constructor(
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private gamesService: GamesService,
    private friendsService: FriendsService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.events.queueStateChange
      .pipe(filter(({ state }) => state === QueueState.launching))
      .subscribe(() => this.launchGame());
  }

  private async launchGame() {
    const friends = this.friendsService.friendships
      .filter((friendship) => {
        const [sourceSlot, targetSlot] = [
          this.queueService.findSlotByPlayerId(friendship.sourcePlayerId),
          this.queueService.findSlotByPlayerId(friendship.targetPlayerId),
        ];
        if (!sourceSlot || !targetSlot) {
          return false;
        }
        return sourceSlot.canMakeFriendsWith.includes(targetSlot.gameClass);
      })
      .map((f) => [f.sourcePlayerId, f.targetPlayerId]);
    await this.gamesService.create(
      this.queueService.slots,
      await this.mapVoteService.getWinner(),
      friends,
    );
    this.queueService.reset();
  }
}
