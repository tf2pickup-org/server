import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { filter } from 'rxjs/operators';

@Injectable()
export class GameLauncherService implements OnModuleInit {

  constructor(
    private queueService: QueueService,
  ) { }

  onModuleInit() {
    this.queueService.state.pipe(
      filter(state => state === 'launching'),
    ).subscribe(() => this.launchGame());
  }

  private async launchGame() {
    this.queueService.reset();
  }

}
