import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { FilterQuery, Model } from 'mongoose';
import { PlayerActionEntry } from '../models/player-action-entry';

export interface PlayerActionsQuery {
  limit: number;
  filters?: FilterQuery<PlayerActionEntry>;
}

@Injectable()
export class PlayerActionsRepositoryService {
  constructor(
    @InjectModel(PlayerActionEntry.name)
    private readonly playerActionEntryModel: Model<PlayerActionEntry>,
  ) {}

  async find(
    query: PlayerActionsQuery = { limit: 10, filters: {} },
  ): Promise<PlayerActionEntry[]> {
    return plainToInstance(
      PlayerActionEntry,
      await this.playerActionEntryModel
        .find(query.filters ?? {})
        .limit(query.limit)
        .sort({ timestamp: -1 })
        .lean()
        .exec(),
    );
  }
}
