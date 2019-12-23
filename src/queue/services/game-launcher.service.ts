import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { filter } from 'rxjs/operators';
import { GamesService } from '@/games/services/games.service';
import { MapVoteService } from './map-vote.service';

@Injectable()
export class GameLauncherService implements OnModuleInit {

  constructor(
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private gamesService: GamesService,
  ) { }

  onModuleInit() {
    this.queueService.stateChange.pipe(
      filter(state => state === 'launching'),
    ).subscribe(() => this.launchGame());
  }

  private async launchGame() {
    const game = await this.gamesService.create(this.queueService.slots, this.mapVoteService.getWinner());
    this.queueService.reset();
    await this.gamesService.launch(game.id);
  }

}
