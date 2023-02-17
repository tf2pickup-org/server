import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Param,
  HttpCode,
  DefaultValuePipe,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseFilters,
  Body,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { GamesService } from '../services/games.service';
import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import { Game } from '../models/game';
import { User } from '@/auth/decorators/user.decorator';
import { Player } from '@/players/models/player';
import { PlayerRole } from '@/players/models/player-role';
import { ConnectInfoDto } from '../dto/connect-info.dto';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { GameDto } from '../dto/game.dto';
import { Serializable } from '@/shared/serializable';
import { PaginatedGameListDto } from '../dto/paginated-game-list.dto';
import { Events } from '@/events/events';
import { GameServerAssignerService } from '../services/game-server-assigner.service';
import { ParseSortParamsPipe } from '../pipes/parse-sort-params.pipe';
import { GameByIdOrNumberPipe } from '../pipes/game-by-id-or-number.pipe';
import { PlayerByIdPipe } from '@/players/pipes/player-by-id.pipe';
import { GameServerOptionIdentifier } from '../dto/game-server-option-identifier';
import { PlayerNotInThisGameErrorFilter } from '../filters/player-not-in-this-game-error.filter';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';

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
    @Query('player', PlayerByIdPipe)
    player?: Player,
  ): Promise<PaginatedGameListDto> {
    let results: Game[];
    let itemCount: number;

    if (!player) {
      [results, itemCount] = await Promise.all([
        this.gamesService.getGames(sort, limit, offset),
        this.gamesService.getGameCount(),
      ]);
    } else {
      [results, itemCount] = await Promise.all([
        this.gamesService.getPlayerGames(player._id, sort, limit, offset),
        this.gamesService.getPlayerGameCount(player._id),
      ]);
    }

    return { results, itemCount };
  }

  // skipcq: JS-0105
  @Get(':id')
  getGame(
    @Param('id', GameByIdOrNumberPipe) game: Game,
  ): Serializable<GameDto> {
    return game;
  }

  @Get(':id/connect-info')
  @Auth()
  @UseFilters(
    DocumentNotFoundFilter,
    GameInWrongStateError,
    PlayerNotInThisGameErrorFilter,
  )
  async getConnectInfo(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @User() player: Player,
  ): Promise<ConnectInfoDto> {
    const joinGameServerTimeout =
      await this.gamesService.calculatePlayerJoinGameServerTimeout(
        game._id,
        player._id,
      );
    return {
      gameId: game.id,
      connectInfoVersion: game.connectInfoVersion,
      connectString: game.connectString,
      voiceChannelUrl:
        (await this.gamesService.getVoiceChannelUrl(game._id, player._id)) ??
        undefined,
      ...(joinGameServerTimeout && {
        joinGameServerTimeout: new Date(joinGameServerTimeout).toISOString(),
      }),
    };
  }

  // skipcq: JS-0105
  @Get(':id/skills')
  @Auth(PlayerRole.admin)
  @UseInterceptors(ClassSerializerInterceptor)
  getGameSkills(@Param('id', GameByIdOrNumberPipe) game: Game) {
    return game.assignedSkills;
  }

  @Put(':id/reinitialize-gameserver')
  @Auth(PlayerRole.admin)
  @HttpCode(202)
  reinitializeGameserver(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @User() admin: Player,
  ) {
    this.events.gameReconfigureRequested.next({
      gameId: game._id,
      adminId: admin._id,
    });
  }

  @Put(':id/force-end')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async forceEnd(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @User() admin: Player,
  ): Promise<Serializable<GameDto>> {
    return await this.gamesService.forceEnd(game._id, admin._id);
  }

  @Put(':id/substitute-player')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async substitutePlayer(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @Query('player', PlayerByIdPipe) player: Player,
    @User() admin: Player,
  ): Promise<Serializable<GameDto>> {
    return await this.playerSubstitutionService.substitutePlayer(
      game._id,
      player._id,
      admin._id,
    );
  }

  @Put(':id/cancel-player-substitute')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async cancelPlayerSubstitute(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @Query('player', PlayerByIdPipe) player: Player,
    @User() admin: Player,
  ): Promise<Serializable<GameDto>> {
    return await this.playerSubstitutionService.cancelSubstitutionRequest(
      game._id,
      player._id,
      admin._id,
    );
  }

  @Put(':id/assign-gameserver')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async assignGameserver(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @Body(ValidationPipe) gameServerId: GameServerOptionIdentifier,
  ): Promise<Serializable<GameDto>> {
    return await this.gameServerAssignerService.assignGameServer(game._id, {
      id: gameServerId.id,
      provider: gameServerId.provider,
    });
  }
}
