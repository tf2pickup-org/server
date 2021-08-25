import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { Player } from '../models/player';
import { OnlinePlayersService } from '../services/online-players.service';
import { PlayersService } from '../services/players.service';

@Controller('online-players')
export class OnlinePlayersController {
  constructor(
    private onlinePlayersService: OnlinePlayersService,
    private playersService: PlayersService,
    private playerPreferencesService: PlayerPreferencesService,
  ) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getOnlinePlayers(): Promise<Player[]> {
    const userWantsToBeOnline = async (
      playerId: string,
    ): Promise<Player | null> => {
      const showOnlineStatus =
        (await this.playerPreferencesService.getPlayerSinglePreference(
          playerId,
          'showOnlineStatus',
          'true',
        )) === 'true';
      if (showOnlineStatus) {
        return await this.playersService.getById(playerId);
      } else {
        return null;
      }
    };

    return (
      await Promise.all(
        this.onlinePlayersService.onlinePlayers.map(userWantsToBeOnline),
      )
    ).filter((player) => player !== null);
  }
}
