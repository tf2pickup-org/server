import { Controller, Get, Query, ParseIntPipe, BadRequestException, Param, NotFoundException, Post, HttpCode } from '@nestjs/common';
import { GamesService } from '../services/games.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';

@Controller('games')
export class GamesController {

  constructor(
    private gamesService: GamesService,
    private gameRuntimeService: GameRuntimeService,
    private playerSubstitutionService: PlayerSubstitutionService,
  ) { }

  @Get()
  async getGames(
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('offset', ParseIntPipe) offset: number = 0,
    @Query('sort') sort: string = '-launched_at',
  ) {
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
      this.gamesService.getGames(sortParam, limit, offset),
      this.gamesService.getGameCount(),
    ]);

    return { results, itemCount };
  }

  @Get(':id')
  async getGame(@Param('id', ObjectIdValidationPipe) gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (game) {
      return game;
    } else {
      throw new NotFoundException();
    }
  }

  @Get(':id/skills')
  @Auth('admin', 'super-user')
  async getGameSkills(@Param('id', ObjectIdValidationPipe) gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (game) {
      return game.assignedSkills;
    } else {
      throw new NotFoundException();
    }
  }

  @Post(':id')
  @Auth('admin', 'super-user')
  @HttpCode(200)
  async takeAdminAction(
    @Param('id', ObjectIdValidationPipe) gameId: string,
    @Query('reinitialize_server') reinitializeServer: any,
    @Query('force_end') forceEnd: any,
    @Query('substitute_player') substitutePlayerId: string,
    @Query('substitute_player_cancel') cancelSubstitutePlayerId: string,
  ) {
    if (reinitializeServer !== undefined) {
      await this.gameRuntimeService.reconfigure(gameId);
    }

    if (forceEnd !== undefined) {
      await this.gameRuntimeService.forceEnd(gameId);
    }

    if (substitutePlayerId !== undefined) {
      await this.playerSubstitutionService.substitutePlayer(gameId, substitutePlayerId);
    }

    if (cancelSubstitutePlayerId !== undefined) {
      await this.playerSubstitutionService.cancelSubstitutionRequest(gameId, cancelSubstitutePlayerId);
    }
  }

}
