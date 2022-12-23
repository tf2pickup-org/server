import { Game, GameDocument } from '@/games/models/game';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameLaunchTimeSpan } from '../interfaces/game-launch-time-span';
import { PlayedMapCount } from '../interfaces/played-map-count';
import { GameLaunchesPerDay } from '../interfaces/game-launches-per-day';

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

  async getGameLaunchTimeSpans(): Promise<GameLaunchTimeSpan[]> {
    const timezone = process.env.TZ ?? 'GMT';
    return await this.gameModel.aggregate([
      {
        $project: {
          dayOfWeek: {
            $dayOfWeek: {
              date: {
                $arrayElemAt: ['$events.at', 0],
              },
              timezone,
            },
          },
          timeOfTheDay: {
            $switch: {
              branches: [
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [6, 7, 8, 9, 10, 11],
                    ],
                  },
                  then: 'morning',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [12, 13, 14, 15, 16, 17],
                    ],
                  },
                  then: 'afternoon',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [18, 19, 20, 21, 22, 23],
                    ],
                  },
                  then: 'evening',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [0, 1, 2, 3, 4, 5],
                    ],
                  },
                  then: 'night',
                },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: '$dayOfWeek',
            timeOfTheDay: '$timeOfTheDay',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          dayOfWeek: '$_id.dayOfWeek',
          timeOfTheDay: '$_id.timeOfTheDay',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }

  async getGameLaunchesPerDay(since: Date): Promise<GameLaunchesPerDay[]> {
    return await this.gameModel.aggregate([
      {
        $match: {
          'events.0.at': {
            $gte: since,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $first: '$events.at',
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          day: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }
}
