import { Injectable, OnModuleInit } from '@nestjs/common';
import { Tf2Map } from '../tf2-map';
import { QueueConfigService } from './queue-config.service';
import { QueueService } from './queue.service';
import { maxBy, shuffle } from 'lodash';

interface MapVote {
  playerId: string;
  map: Tf2Map;
}

export interface MapVoteResult {
  map: Tf2Map;
  voteCount: number;
}

@Injectable()
export class MapVoteService implements OnModuleInit {

  public mapOptions: Tf2Map[];

  get results(): MapVoteResult[] {
    return this.mapOptions
      .map(map => ({ map, voteCount: this.voteCountForMap(map) }));
  }

  private lastPlayedMap: string;
  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[];

  constructor(
    private queueConfigService: QueueConfigService,
    private queueService: QueueService,
  ) {
    this.reset();
  }

  onModuleInit() {
    this.queueService.playerLeave.subscribe(playerId => this.resetPlayerVote(playerId));
  }

  voteCountForMap(map: Tf2Map): number {
    return this.votes.filter(v => v.map === map).length;
  }

  voteForMap(playerId: string, map: Tf2Map) {
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
  }

  playerVote(playerId: string): Tf2Map {
    return this.votes.find(v => v.playerId === playerId)?.map;
  }

  /**
   * Decides the winner and resets the vote.
   */
  getWinner() {
    const maxVotes = maxBy(this.results, r => r.voteCount).voteCount;
    const mapsWithMaxVotes = this.results.filter(m => m.voteCount === maxVotes);
    const map = mapsWithMaxVotes[Math.floor(Math.random() * mapsWithMaxVotes.length)].map;
    this.lastPlayedMap = map;
    setImmediate(() => this.reset());
    return map;
  }

  private reset() {
    this.mapOptions = shuffle(this.queueConfigService.queueConfig.maps.filter(m => m !== this.lastPlayedMap))
      .slice(0, this.mapVoteOptionCount);
    this.votes = [];
  }

  private resetPlayerVote(playerId: string) {
    this.votes = [ ...this.votes.filter(v => v.playerId !== playerId) ];
  }

}
