import { Controller, Get } from '@nestjs/common';
import { GameServersService } from '../services/game-servers.service';

@Controller('game-servers')
export class GameServersController {
  constructor(private readonly gameServersService: GameServersService) {}

  @Get('options')
  async getGameServerOptions() {
    return await this.gameServersService.findAllGameServerOptions();
  }
}
