import { ObjectIdOrSteamIdPipe } from '@/shared/pipes/object-id-or-steam-id.pipe';
import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { isUndefined } from 'lodash';
import { Error } from 'mongoose';
import { Player } from '../models/player';
import { PlayersService } from '../services/players.service';

@Injectable()
export class PlayerByIdPipe
  implements PipeTransform<string, Promise<Player | undefined>>
{
  private objectIdOrSteamIdValidationPipe = new ObjectIdOrSteamIdPipe();

  constructor(private playersService: PlayersService) {}

  async transform(value: string): Promise<Player | undefined> {
    if (isUndefined(value)) {
      return undefined;
    }

    try {
      const playerId = this.objectIdOrSteamIdValidationPipe.transform(value);
      switch (playerId.type) {
        case 'object-id':
          return await this.playersService.getById(playerId.objectId);

        case 'steam-id':
          return await this.playersService.findBySteamId(playerId.steamId64);

        // no default
      }
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        throw new NotFoundException();
      } else {
        throw error;
      }
    }
  }
}
