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
  ) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getOnlinePlayers(): Promise<Player[]> {
    return this.playersService.getManyById(
      ...this.onlinePlayersService.onlinePlayers,
    );
  }
}
