import { Controller, Get, Param, NotFoundException, Patch, Body, BadRequestException, ParseIntPipe, Query } from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Player } from '../models/player';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GamesService } from '@/games/services/games.service';
import { PlayerSkillService } from '../services/player-skill.service';

@Controller('players')
export class PlayersController {

  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerSkillService: PlayerSkillService,
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

  @Get(':id/games')
  async getPlayerGames(@Param('id', ObjectIdValidationPipe) playerId: string, @Query('limit', ParseIntPipe) limit: number = 10,
                       @Query('offset', ParseIntPipe) offset: number = 0, @Query('sort') sort: string = '-launched_at') {
    let sortParam: { launchedAt: 1 | -1 };
    switch (sort) {
      case '-launched_at':
      case '-launchedAt':
        sortParam = { launchedAt: -1 };
        break;

      case 'launched_at':
      case 'launchedAt':
        sortParam = { launchedAt: 1 };
        break;

      default:
        throw new BadRequestException('invalid value for the sort parameter');
    }

    const [ results, itemCount ] = await Promise.all([
      this.gamesService.getPlayerGames(playerId, sortParam, limit, offset),
      this.gamesService.getPlayerGameCount(playerId),
    ]);

    return { results, itemCount };
  }

  @Get(':id/stats')
  async getPlayerStats(@Param('id', ObjectIdValidationPipe) playerId: string) {
    return await this.playersService.getPlayerStats(playerId);
  }

  @Get(':id/skill')
  @Auth('admin', 'super-user')
  async getPlayerSkill(@Param('id', ObjectIdValidationPipe) playerId: string) {
    return (await this.playerSkillService.getPlayerSkill(playerId)).skill;
  }

}
