import { Serializable } from '@/shared/serializable';
import { Controller, Get } from '@nestjs/common';
import { PlayerDto } from '../dto/player.dto';
import { OnlinePlayersService } from '../services/online-players.service';
import { PlayersService } from '../services/players.service';

@Controller('online-players')
export class OnlinePlayersController {
  constructor(
    private onlinePlayersService: OnlinePlayersService,
    private playersService: PlayersService,
  ) {}

  @Get()
  async getOnlinePlayers(): Promise<Serializable<PlayerDto>[]> {
    return await this.playersService.getManyById(
      ...this.onlinePlayersService.onlinePlayers,
    );
  }
}
