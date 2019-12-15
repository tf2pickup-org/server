import { Controller, Get, Param, NotFoundException, Patch, Body } from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Player } from '../models/player';
import { Auth } from '@/auth/decorators/auth.decorator';

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

  @Patch(':id')
  @Auth('admin', 'super-user')
  async updatePlayer(@Param('id', ObjectIdValidationPipe) playerId: string, @Body() player: Partial<Player>) {
    return await this.playersService.updatePlayer(playerId, player);
  }

}
