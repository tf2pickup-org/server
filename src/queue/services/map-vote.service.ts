import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { maxBy, shuffle } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { MapVoteResult } from '../map-vote-result';
import { Events } from '@/events/events';
import { MapPoolEntry, MapPoolEntryDocument } from '../models/map-pool-entry';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerId } from '@/players/types/player-id';

interface MapVote {
  playerId: PlayerId;
  map: string;
}

@Injectable()
export class MapVoteService implements OnModuleInit {
  private readonly logger = new Logger(MapVoteService.name);
  private readonly _results = new BehaviorSubject<MapVoteResult[]>([]);

  // available options to vote for
  public mapOptions: string[] = [];

  get results(): MapVoteResult[] {
    return this._results.value;
  }

  private readonly mapVoteOptionCount = 3;
  private votes: MapVote[] = [];

  constructor(
    @InjectModel(MapPoolEntry.name)
    private mapPoolEntryModel: Model<MapPoolEntryDocument>,
    private queueService: QueueService,
    private events: Events,
    private readonly configurationService: ConfigurationService,
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

  voteForMap(playerId: PlayerId, map: string) {
    if (!this.mapOptions.includes(map)) {
      throw new Error('this map is not an option in the vote');
    }

    if (!this.queueService.isInQueue(playerId)) {
      throw new Error('player not in queue');
    }

    this.votes = [
      ...this.votes.filter((v) => !v.playerId.equals(playerId)),
      { map, playerId },
    ];

    this._results.next(this.getResults());
  }

  playerVote(playerId: PlayerId): string | undefined {
    return this.votes.find((v) => v.playerId.equals(playerId))?.map;
  }

  /**
   * Decides the winner and resets the vote.
   */
  async getWinner() {
    const maxVotes = maxBy(this.results, (r) => r.voteCount)?.voteCount;
    const mapsWithMaxVotes = this.results.filter(
      (m) => m.voteCount === maxVotes,
    );
    const map =
      mapsWithMaxVotes[Math.floor(Math.random() * mapsWithMaxVotes.length)].map;
    await this.mapPoolEntryModel.updateMany(
      { cooldown: { $gt: 0 } },
      { $inc: { cooldown: -1 } },
    );
    const cooldown =
      await this.configurationService.get<number>('queue.map_cooldown');
    await this.mapPoolEntryModel.updateOne({ name: map }, { cooldown });
    setImmediate(() => this.scramble());
    return map;
  }

  /**
   * Randomly maps that will be available for vote.
   */
  async scramble(actorId?: PlayerId) {
    this.mapOptions = shuffle(
      await this.mapPoolEntryModel.find({ cooldown: { $lte: 0 } }).exec(),
    )
      .slice(0, this.mapVoteOptionCount)
      .map((m) => m.name);
    this.logger.debug(`Map options: ${this.mapOptions.join(',')}`);
    this.events.mapsScrambled.next({ mapOptions: this.mapOptions, actorId });
    this.votes = [];
    this._results.next(this.getResults());
    return this.results;
  }

  private resetPlayerVote(playerId: PlayerId) {
    this.votes = [...this.votes.filter((v) => !v.playerId.equals(playerId))];
    this._results.next(this.getResults());
  }

  private getResults() {
    return this.mapOptions.map((map) => ({
      map,
      voteCount: this.voteCountForMap(map),
    }));
  }
}
