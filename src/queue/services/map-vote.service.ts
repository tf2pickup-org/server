import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { QueueConfigService } from './queue-config.service';
import { QueueService } from './queue.service';
import { maxBy, shuffle } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { MapVoteResult } from '../map-vote-result';
import { QueueGateway } from '../gateways/queue.gateway';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';

interface MapVote {
  playerId: ObjectId;
  map: string;
}

@Injectable()
export class MapVoteService implements OnModuleInit {

  private readonly mapCooldown = this.configService.get<number>('queue.mapCooldown');
  private _results = new BehaviorSubject<MapVoteResult[]>([]);
  private mapPool= this.queueConfigService.queueConfig.maps.map(m => ({ map: m.name, cooldown: 0 }));

  // available options to vote for
  public mapOptions: string[];

  get results(): MapVoteResult[] {
    return this._results.value;
  }

  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[];

  constructor(
    private queueConfigService: QueueConfigService,
    @Inject(forwardRef(() => QueueService)) private queueService: QueueService,
    @Inject(forwardRef(() => QueueGateway)) private queueGateway: QueueGateway,
    private configService: ConfigService,
  ) {
    this.reset();
  }

  onModuleInit() {
    this.queueService.playerLeave.subscribe(playerId => this.resetPlayerVote(playerId));
    this._results.subscribe(results => this.queueGateway.emitVoteResultsUpdate(results));
  }

  voteCountForMap(map: string): number {
    return this.votes.filter(v => v.map === map).length;
  }

  voteForMap(playerId: ObjectId, map: string) {
    if (!this.mapOptions.includes(map)) {
      throw new Error('this map is not an option in the vote');
    }

    if (!this.queueService.isInQueue(playerId)) {
      throw new Error('player not in queue');
    }

    this.votes = [
      ...this.votes.filter(v => v.playerId !== playerId),
      { map, playerId },
    ];

    this._results.next(this.getResults());
  }

  playerVote(playerId: ObjectId): string {
    return this.votes.find(v => v.playerId.equals(playerId))?.map;
  }

  /**
   * Decides the winner and resets the vote.
   */
  getWinner() {
    const maxVotes = maxBy(this.results, r => r.voteCount).voteCount;
    const mapsWithMaxVotes = this.results.filter(m => m.voteCount === maxVotes);
    const map = mapsWithMaxVotes[Math.floor(Math.random() * mapsWithMaxVotes.length)].map;
    this.mapPool.find(m => m.map === map).cooldown = this.mapCooldown;
    setImmediate(() => this.reset());
    return map;
  }

  private reset() {
    this.mapOptions = shuffle(
        this.mapPool
          .filter(m => m.cooldown <= 0)
          .map(m => m.map)
    ).slice(0, this.mapVoteOptionCount);
    this.votes = [];
    this._results.next(this.getResults());
    this.mapPool.forEach(p => p.cooldown -= 1);
  }

  private resetPlayerVote(playerId: ObjectId) {
    this.votes = [ ...this.votes.filter(v => !v.playerId.equals(playerId)) ];
    this._results.next(this.getResults());
  }

  private getResults() {
    return this.mapOptions
      .map(map => ({ map, voteCount: this.voteCountForMap(map) }));
  }

}
