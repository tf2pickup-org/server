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
import { GameInWrongStateErrorFilter } from '../filters/game-in-wrong-state-error.filter';
import { GameEventDto } from '../dto/game-event.dto';
import { GameSlotDto } from '../dto/game-slot-dto';
import { GameState } from '../models/game-state';
import { FilterQuery } from 'mongoose';
import { ParseEnumArrayPipe } from '@/shared/pipes/parse-enum-array.pipe';
import { VoiceChannelUrlsService } from '../services/voice-channel-urls.service';

@Controller('games')
export class GamesController {
  constructor(
    private gamesService: GamesService,
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
    private gameServerAssignerService: GameServerAssignerService,
    private readonly voiceChannelUrlsService: VoiceChannelUrlsService,
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
  ): Promise<PaginatedGameListDto> {
    const filter: FilterQuery<Game> = { state };
    if (player) {
      filter['slots.player'] = player._id;
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
        (await this.voiceChannelUrlsService.getVoiceChannelUrl(
          game._id,
          player._id,
        )) ?? undefined,
      ...(joinGameServerTimeout && {
        joinGameServerTimeout: new Date(joinGameServerTimeout).toISOString(),
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
}
