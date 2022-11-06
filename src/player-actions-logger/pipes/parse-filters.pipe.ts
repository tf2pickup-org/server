import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { Injectable, PipeTransform } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { FilterQuery } from 'mongoose';
import { PlayerActionEntry } from '../models/player-action-entry';

@Injectable()
export class ParseFiltersPipe implements PipeTransform {
  constructor(private readonly playersService: PlayersService) {}

  async transform(input: {
    [key: string]: string;
  }): Promise<FilterQuery<PlayerActionEntry>> {
    if (isEmpty(input)) {
      return {};
    }

    const playerQuery: FilterQuery<Player> = {};
    const query: FilterQuery<PlayerActionEntry> = {};

    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith('player.')) {
        playerQuery[key.split('.').slice(1).join('.')] = value;
      } else {
        query[key] = value;
      }
    }

    const players = (await this.playersService.find(playerQuery)).map(
      (player) => player._id,
    );

    query.player = [...new Set(players)];
    return query;
  }
}
