import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Controller, Get } from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';
import { GameServerOptionDto } from '../dto/game-server-option.dto';

@Controller('game-servers')
export class GameServersController {
  constructor(private readonly gameServersService: GameServersService) {}

  @Get('options')
  @Auth(PlayerRole.admin)
  async getGameServerOptions(): Promise<GameServerOptionDto[]> {
    return await this.gameServersService.findAllGameServerOptions();
  }
}
