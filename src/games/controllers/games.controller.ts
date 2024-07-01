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
  StreamableFile,
  NotFoundException,
  Logger,
  BadRequestException,
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
import { ParseDatePipe } from '@/shared/pipes/parse-date.pipe';
import { GameServerOptionIdentifier } from '../dto/game-server-option-identifier';
import { PlayerNotInThisGameErrorFilter } from '../filters/player-not-in-this-game-error.filter';
import { GameInWrongStateErrorFilter } from '../filters/game-in-wrong-state-error.filter';
import { GameEventDto } from '../dto/game-event.dto';
import { GameSlotDto } from '../dto/game-slot-dto';
import { GameState } from '../models/game-state';
import { FilterQuery } from 'mongoose';
import { ParseEnumArrayPipe } from '@/shared/pipes/parse-enum-array.pipe';
import { VoiceChannelUrlsService } from '../services/voice-channel-urls.service';
import { GameLogsService } from '../services/game-logs.service';
import { Environment } from '@/environment/environment';

@Controller('games')
export class GamesController {
  readonly logger = new Logger(GamesController.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly playerSubstitutionService: PlayerSubstitutionService,
    private readonly events: Events,
    private readonly gameServerAssignerService: GameServerAssignerService,
    private readonly voiceChannelUrlsService: VoiceChannelUrlsService,
    private readonly gameLogsService: GameLogsService,
    private readonly environment: Environment,
  ) {}

  @Get()
  async getGames(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    // TODO v12: rename offset to skip
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('sort', new DefaultValuePipe('-launched_at'), ParseSortParamsPipe)
    sort: Record<string, 1 | -1>,
    @Query(
      'state',
      new DefaultValuePipe(Object.values(GameState).join(',')),
      new ParseEnumArrayPipe(GameState),
    )
    state: GameState[],
    @Query('player', PlayerByIdPipe)
    player?: Player,
    @Query('from', ParseDatePipe)
    from?: Date,
    @Query('to', ParseDatePipe)
    to?: Date,
  ): Promise<PaginatedGameListDto> {
    const filter: FilterQuery<Game> = { state };

    if (player) {
      filter['slots.player'] = player._id;
    }

    if (from && to) {
      if (from > to) {
        throw new BadRequestException("'from' date cannot be later than 'to'");
      }
      filter.events = {
        $elemMatch: { event: 'ended', at: { $gte: from, $lte: to } },
      };
    } else if (from) {
      filter.events = {
        $elemMatch: { event: 'ended', at: { $gte: from } },
      };
    } else if (to) {
      filter.events = {
        $elemMatch: { event: 'ended', at: { $lte: to } },
      };
    }

    const [results, itemCount] = await Promise.all([
      this.gamesService.getGames(filter, { sort, limit, skip }),
      this.gamesService.getGameCount(filter),
    ]);

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
    GameInWrongStateErrorFilter,
    PlayerNotInThisGameErrorFilter,
  )
  async getConnectInfo(
    @Param('id', GameByIdOrNumberPipe) game: Game,
    @User() player: Player,
  ): Promise<ConnectInfoDto> {
    const [joinGameServerTimeout, voiceChannelUrl] = await Promise.all([
      this.gamesService.calculatePlayerJoinGameServerTimeout(
        game._id,
        player._id,
      ),
      this.voiceChannelUrlsService.getVoiceChannelUrl(game._id, player._id),
    ]);

    return {
      gameId: game.id,
      connectInfoVersion: game.connectInfoVersion,
      connectString: game.connectString,
      ...(voiceChannelUrl && { voiceChannelUrl }),
      ...(joinGameServerTimeout && {
        joinGameServerTimeout: joinGameServerTimeout.toISOString(),
      }),
    };
  }

  @Get(':id/slots')
  getSlots(
    @Param('id', GameByIdOrNumberPipe) game: Game,
  ): Serializable<GameSlotDto>[] {
    return game.slots;
  }

  @Get(':id/events')
  getEvents(
    @Param('id', GameByIdOrNumberPipe) game: Game,
  ): Serializable<GameEventDto>[] {
    return game.events;
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
    @User() admin: Player,
  ): Promise<Serializable<GameDto>> {
    return await this.gameServerAssignerService.assignGameServer(
      game._id,
      {
        id: gameServerId.id,
        provider: gameServerId.provider,
      },
      admin._id,
    );
  }

  @Get(':id/logs')
  @UseFilters(DocumentNotFoundFilter)
  async downloadLogs(
    @Param('id', GameByIdOrNumberPipe) game: Game,
  ): Promise<StreamableFile> {
    if (game.logSecret === undefined) {
      throw new NotFoundException('logs are not available for this game');
    }

    if (![GameState.ended, GameState.interrupted].includes(game.state)) {
      throw new BadRequestException('logs are available only for ended games');
    }

    const logs = await this.gameLogsService.getLogs(game.logSecret);
    const fileName = `${this.environment.websiteName.replace(
      /[/\\?%*:|"<>]/g,
      '_',
    )}-${game.number}.log`;

    return new StreamableFile(Buffer.from(logs), {
      type: 'text/plain',
      disposition: `attachment; filename=${fileName}`,
    });
  }
}
