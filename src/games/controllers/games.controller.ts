import { Controller, Get, Query, ParseIntPipe, BadRequestException, Param, NotFoundException, Post, HttpCode, UsePipes, ValidationPipe, DefaultValuePipe } from '@nestjs/common';
import { GamesService } from '../services/games.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { IsOneOfPipe } from '@/shared/pipes/is-one-of.pipe';
import { Game } from '../models/game';

const sortOptions: string[] = [
  'launched_at',
  'launchedAt',
  '-launched_at',
  '-launchedAt',
];

@Controller('games')
export class GamesController {

  constructor(
    private gamesService: GamesService,
    private gameRuntimeService: GameRuntimeService,
    private playerSubstitutionService: PlayerSubstitutionService,
  ) { }

  @Get()
  async getGames(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('sort', new DefaultValuePipe('-launched_at'), new IsOneOfPipe(sortOptions)) sort: string,
    @Query('playerId') playerId?: string,
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
    }

    let results: Game[];
    let itemCount: number;

    if (playerId === undefined) {
      [ results, itemCount ] = await Promise.all([
        this.gamesService.getGames(sortParam, limit, offset),
        this.gamesService.getGameCount(),
      ]);
    } else {
      [ results, itemCount ] = await Promise.all([
        this.gamesService.getPlayerGames(playerId, sortParam, limit, offset),
        this.gamesService.getPlayerGameCount(playerId),
      ]);
    }

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
