import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';

@Controller('players')
export class PlayersController {

  constructor(
    private playersService: PlayersService,
  ) { }

  @Get()
  async getAllPlayers() {
    return await this.playersService.getAll();
  }

  @Get(':id')
  async getPlayer(@Param('id', ObjectIdValidationPipe) playerId: string) {
    const player = await this.playersService.getById(playerId);
    if (player) {
      return player;
    } else {
      throw new NotFoundException();
    }
  }

}
