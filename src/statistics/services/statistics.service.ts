import { Game, GameDocument } from '@/games/models/game';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayedMapCount } from '../interfaces/played-map-count';

@Injectable()
export class StatisticsService {
  constructor(@InjectModel(Game.name) private gameModel: Model<GameDocument>) {}

  async getPlayedMapsCount(): Promise<PlayedMapCount[]> {
    return await this.gameModel.aggregate([
      {
        $project: {
          mapName: { $arrayElemAt: [{ $split: ['$map', '_'] }, 1] },
        },
      },
      { $group: { _id: '$mapName', count: { $sum: 1 } } },
      {
        $project: {
          mapName: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}
