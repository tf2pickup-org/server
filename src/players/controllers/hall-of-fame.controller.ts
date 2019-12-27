import { Controller, Get } from '@nestjs/common';
import { GamesService } from '@/games/services/games.service';

@Controller('hall-of-fame')
export class HallOfFameController {

  constructor(
    private gamesService: GamesService,
  ) { }

  @Get()
  async getHallOfFame() {
    const mostActivePlayers = await this.gamesService.getMostActivePlayers();
    const mostActiveMedics = await this.gamesService.getMostActiveMedics();
    return { mostActivePlayers, mostActiveMedics };
  }

}
