import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Param,
  Post,
  HttpCode,
  DefaultValuePipe,
  UnauthorizedException,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { GamesService } from '../services/games.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GameRuntimeService } from '../services/game-runtime.service';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { IsOneOfPipe } from '@/shared/pipes/is-one-of.pipe';
import { Game } from '../models/game';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayerRole } from '@/players/models/player-role';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { ConnectInfoDto } from '../dto/connect-info.dto';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { SerializerInterceptor } from '@/shared/interceptors/serializer.interceptor';
import { GameDto } from '../dto/game.dto';
import { Serializable } from '@/shared/serializable';
import { PaginatedGameListDto } from '../dto/paginated-game-list.dto';

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
  ) {}

  @Get()
  @UseInterceptors(SerializerInterceptor)
  async getGames(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query(
      'sort',
      new DefaultValuePipe('-launched_at'),
      new IsOneOfPipe(sortOptions),
    )
    sort: string,
    @Query('playerId') playerId?: string,
  ): Promise<PaginatedGameListDto> {
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
      [results, itemCount] = await Promise.all([
        this.gamesService.getGames(sortParam, limit, offset),
        this.gamesService.getGameCount(),
      ]);
    } else {
      [results, itemCount] = await Promise.all([
        this.gamesService.getPlayerGames(playerId, sortParam, limit, offset),
        this.gamesService.getPlayerGameCount(playerId),
      ]);
    }

    return { results, itemCount };
  }

  @Get(':id')
  @UseFilters(DocumentNotFoundFilter)
  @UseInterceptors(SerializerInterceptor)
  async getGame(
    @Param('id', ObjectIdValidationPipe) gameId: string,
  ): Promise<Serializable<GameDto>> {
    return await this.gamesService.getById(gameId);
  }

  @Get(':id/connect-info')
  @Auth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getConnectInfo(
    @Param('id', ObjectIdValidationPipe) gameId: string,
    @User() player: Player,
  ): Promise<ConnectInfoDto> {
    try {
      const game = await this.gamesService.getById(gameId);
      return {
        gameId: game.id,
        connectInfoVersion: game.connectInfoVersion,
        connectString: game.connectString,
        voiceChannelUrl: await this.gamesService.getVoiceChannelUrl(
          gameId,
          player.id,
        ),
      };
    } catch (error) {
      if (error instanceof PlayerNotInThisGameError) {
        throw new UnauthorizedException(
          'player does not take part in this game',
        );
      } else {
        throw error;
      }
    }
  }

  @Get(':id/skills')
  @Auth(PlayerRole.admin)
  @UseFilters(DocumentNotFoundFilter)
  @UseInterceptors(ClassSerializerInterceptor)
  async getGameSkills(@Param('id', ObjectIdValidationPipe) gameId: string) {
    return (await this.gamesService.getById(gameId)).assignedSkills;
  }

  @Post(':id')
  @Auth(PlayerRole.admin)
  @UseFilters(DocumentNotFoundFilter)
  @HttpCode(200)
  async takeAdminAction(
    @Param('id', ObjectIdValidationPipe) gameId: string,
    @Query('reinitialize_server') reinitializeServer: any,
    @Query('force_end') forceEnd: any,
    @Query('substitute_player') substitutePlayerId: string,
    @Query('substitute_player_cancel') cancelSubstitutePlayerId: string,
    @User() admin: Player,
  ) {
    if (reinitializeServer !== undefined) {
      await this.gameRuntimeService.reconfigure(gameId);
    }

    if (forceEnd !== undefined) {
      await this.gameRuntimeService.forceEnd(gameId, admin.id);
    }

    if (substitutePlayerId !== undefined) {
      await this.playerSubstitutionService.substitutePlayer(
        gameId,
        substitutePlayerId,
        admin.id,
      );
    }

    if (cancelSubstitutePlayerId !== undefined) {
      await this.playerSubstitutionService.cancelSubstitutionRequest(
        gameId,
        cancelSubstitutePlayerId,
        admin.id,
      );
    }
  }
}
