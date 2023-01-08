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
  Body,
  BadRequestException,
} from '@nestjs/common';
import { GamesService } from '../services/games.service';
import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Game } from '../models/game';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayerRole } from '@/players/models/player-role';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { ConnectInfoDto } from '../dto/connect-info.dto';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { GameDto } from '../dto/game.dto';
import { Serializable } from '@/shared/serializable';
import { PaginatedGameListDto } from '../dto/paginated-game-list.dto';
import { Events } from '@/events/events';
import { GameServerOptionIdentifier } from '@/game-servers/interfaces/game-server-option';
import { GameServerAssignerService } from '../services/game-server-assigner.service';
import { ParseSortParamsPipe } from '../pipes/parse-sort-params.pipe';
import { GameByIdOrNumberPipe } from '../pipes/game-by-id-or-number.pipe';

@Controller('games')
export class GamesController {
  constructor(
    private gamesService: GamesService,
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
    private gameServerAssignerService: GameServerAssignerService,
  ) {}

  @Get()
  async getGames(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('sort', new DefaultValuePipe('-launched_at'), ParseSortParamsPipe)
    sort: Record<string, 1 | -1>,
    @Query('playerId') playerId?: string,
  ): Promise<PaginatedGameListDto> {
    let results: Game[];
    let itemCount: number;

    if (playerId === undefined) {
      [results, itemCount] = await Promise.all([
        this.gamesService.getGames(sort, limit, offset),
        this.gamesService.getGameCount(),
      ]);
    } else {
      [results, itemCount] = await Promise.all([
        this.gamesService.getPlayerGames(playerId, sort, limit, offset),
        this.gamesService.getPlayerGameCount(playerId),
      ]);
    }

    return { results, itemCount };
  }

  @Get(':id')
  @UseFilters(DocumentNotFoundFilter)
  async getGame(
    @Param('id', GameByIdOrNumberPipe) game: Game,
  ): Promise<Serializable<GameDto>> {
    return game;
  }

  @Get(':id/connect-info')
  @Auth()
  @UseFilters(DocumentNotFoundFilter)
  async getConnectInfo(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @User() player: Player,
  ): Promise<ConnectInfoDto> {
    try {
      return {
        gameId: game.id,
        connectInfoVersion: game.connectInfoVersion,
        connectString: game.connectString,
        voiceChannelUrl: await this.gamesService.getVoiceChannelUrl(
          game.id,
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
  async getGameSkills(@Param('id', GameByIdOrNumberPipe) game: Game) {
    return game.assignedSkills;
  }

  @Post(':id')
  @Auth(PlayerRole.admin)
  @UseFilters(DocumentNotFoundFilter)
  @HttpCode(200)
  async takeAdminAction(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @Query('reinitialize_server') reinitializeServer: any,
    @Query('force_end') forceEnd: any,
    @Query('substitute_player') substitutePlayerId: string,
    @Query('substitute_player_cancel') cancelSubstitutePlayerId: string,
    @Query('assign_gameserver') assignGameserver,
    @User() admin: Player,
    @Body() body: unknown,
  ) {
    if (reinitializeServer !== undefined) {
      this.events.gameReconfigureRequested.next({
        gameId: game.id,
        adminId: admin.id,
      });
    }

    if (forceEnd !== undefined) {
      await this.gamesService.forceEnd(game.id, admin.id);
    }

    if (substitutePlayerId !== undefined) {
      await this.playerSubstitutionService.substitutePlayer(
        game.id,
        substitutePlayerId,
        admin.id,
      );
    }

    if (cancelSubstitutePlayerId !== undefined) {
      await this.playerSubstitutionService.cancelSubstitutionRequest(
        game.id,
        cancelSubstitutePlayerId,
        admin.id,
      );
    }

    if (assignGameserver !== undefined) {
      const { id, provider } = body as GameServerOptionIdentifier;
      if (!id || !provider) {
        throw new BadRequestException('invalid gameserver identifier');
      }

      await this.gameServerAssignerService.assignGameServer(game.id, {
        id,
        provider,
      });
    }
  }
}
