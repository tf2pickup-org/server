import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { maxBy, shuffle } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { MapVoteResult } from '../map-vote-result';
import { mapCooldown } from '@configs/queue';
import { Events } from '@/events/events';
import { Map, MapDocument } from '../models/map';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface MapVote {
  playerId: string;
  map: string;
}

@Injectable()
export class MapVoteService implements OnModuleInit {
  private readonly logger = new Logger(MapVoteService.name);
  private readonly _results = new BehaviorSubject<MapVoteResult[]>([]);

  // available options to vote for
  public mapOptions: string[];

  get results(): MapVoteResult[] {
    return this._results.value;
  }

  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[];

  constructor(
    @InjectModel(Map.name) private mapModel: Model<MapDocument>,
    private queueService: QueueService,
    private events: Events,
  ) {}

  async onModuleInit() {
    this._results.subscribe((results) =>
      this.events.mapVotesChange.next({ results }),
    );

    this.events.playerLeavesQueue.subscribe(({ playerId }) =>
      this.resetPlayerVote(playerId),
    );
    this.events.mapPoolChange.subscribe(() => this.scramble());
    await this.scramble();
  }

  voteCountForMap(map: string): number {
    return this.votes.filter((v) => v.map === map).length;
  }

  voteForMap(playerId: string, map: string) {
    if (!this.mapOptions.includes(map)) {
      throw new Error('this map is not an option in the vote');
    }

    if (!this.queueService.isInQueue(playerId)) {
      throw new Error('player not in queue');
    }

    this.votes = [
      ...this.votes.filter((v) => v.playerId !== playerId),
      { map, playerId },
    ];

    this._results.next(this.getResults());
  }

  playerVote(playerId: string): string {
    return this.votes.find((v) => v.playerId === playerId)?.map;
  }

  /**
   * Decides the winner and resets the vote.
   */
  async getWinner() {
    const maxVotes = maxBy(this.results, (r) => r.voteCount).voteCount;
    const mapsWithMaxVotes = this.results.filter(
      (m) => m.voteCount === maxVotes,
    );
    const map =
      mapsWithMaxVotes[Math.floor(Math.random() * mapsWithMaxVotes.length)].map;
    await this.mapModel.updateMany(
      { cooldown: { $gt: 0 } },
      { $inc: { cooldown: -1 } },
    );
    await this.mapModel.updateOne({ name: map }, { cooldown: mapCooldown });
    setImmediate(() => this.scramble());
    return map;
  }

  /**
   * Randomly maps that will be available for vote.
   */
  async scramble() {
    this.mapOptions = shuffle(
      await this.mapModel.find({ cooldown: { $lte: 0 } }).exec(),
    )
      .slice(0, this.mapVoteOptionCount)
      .map((m) => m.name);
    this.logger.debug(`Map options: ${this.mapOptions.join(',')}`);
    this.votes = [];
    this._results.next(this.getResults());
    return this.results;
  }

  private resetPlayerVote(playerId: string) {
    this.votes = [...this.votes.filter((v) => v.playerId !== playerId)];
    this._results.next(this.getResults());
  }

  private getResults() {
    return this.mapOptions.map((map) => ({
      map,
      voteCount: this.voteCountForMap(map),
    }));
  }
}
