import { Injectable } from '@nestjs/common';
import { QueueService } from './queue.service';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';
import { filter } from 'rxjs/operators';
import { FriendsService } from './friends.service';

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
  ) { }

  onModuleInit() {
    this.queueService.stateChange.pipe(
      filter(state => state === 'launching'),
    ).subscribe(() => this.launchGame());
  }

  private async launchGame() {
    const friends = this.friendsService.friendships.map(f => [ f.sourcePlayerId, f.targetPlayerId ]);
    const game = await this.gamesService.create(this.queueService.slots, this.mapVoteService.getWinner(), friends);
    this.queueService.reset();
    await this.gamesService.launch(game.id);
  }

}
