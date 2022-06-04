import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Patch,
  Body,
  BadRequestException,
  ParseIntPipe,
  Query,
  Put,
  Post,
  UsePipes,
  ValidationPipe,
  HttpCode,
  Header,
  UseInterceptors,
  CacheInterceptor,
  CacheTTL,
} from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Player } from '../models/player';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GamesService } from '@/games/services/games.service';
import { PlayerSkillService } from '../services/player-skill.service';
import { PlayerBansService } from '../services/player-bans.service';
import { PlayerBan } from '../models/player-ban';
import { User } from '@/auth/decorators/user.decorator';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { PlayerStatsDto } from '../dto/player-stats.dto';
import { ForceCreatePlayer } from '../dto/force-create-player';
import { PlayerRole } from '../models/player-role';
import { LinkedProfilesService } from '../services/linked-profiles.service';
import { LinkedProfilesDto } from '../dto/linked-profiles.dto';
import { PlayerByIdPipe } from '../pipes/player-by-id.pipe';
import { Serializable } from '@/shared/serializable';
import { PlayerDto } from '../dto/player.dto';
import { PlayerSkillDto } from '../dto/player-skill.dto';
import { PlayerBanDto } from '../dto/player-ban.dto';

@Controller('players')
@UseInterceptors(CacheInterceptor)
export class PlayersController {
  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerSkillService: PlayerSkillService,
    private playerBansService: PlayerBansService,
    private linkedProfilesService: LinkedProfilesService,
  ) {}

  @Get()
  async getAllPlayers(): Promise<Serializable<PlayerDto>[]> {
    return await this.playersService.getAll();
  }

  @Get(':id')
  async getPlayer(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<Serializable<PlayerDto>> {
    return player;
  }

  @Post()
  @Auth(PlayerRole.admin)
  @UsePipes(ValidationPipe)
  async forceCreatePlayer(
    @Body() player: ForceCreatePlayer,
  ): Promise<Serializable<PlayerDto>> {
    return await this.playersService.forceCreatePlayer(player);
  }

  @Patch(':id')
  @Auth(PlayerRole.admin)
  async updatePlayer(
    @Param('id', PlayerByIdPipe) player: Player,
    @Body() update: Partial<Player>,
    @User() admin: Player,
  ): Promise<Serializable<PlayerDto>> {
    return await this.playersService.updatePlayer(player.id, update, admin.id);
  }

  /**
   * @deprecated
   */
  @Get(':id/games')
  @Header('Warning', '299 - "Deprecated API"')
  async getPlayerGames(
    @Param('id', PlayerByIdPipe) player: Player,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('offset', ParseIntPipe) offset = 0,
    @Query('sort') sort = '-launched_at',
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

    const [results, itemCount] = await Promise.all([
      this.gamesService.getPlayerGames(player.id, sortParam, limit, offset),
      this.gamesService.getPlayerGameCount(player.id),
    ]);

    return { results, itemCount };
  }

  @CacheTTL(12 * 60 * 60)
  @Get(':id/stats')
  async getPlayerStats(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<PlayerStatsDto> {
    return await this.playersService.getPlayerStats(player.id);
  }

  @Get('/all/skill')
  @Auth(PlayerRole.admin)
  async getAllPlayerSkills(): Promise<Serializable<PlayerSkillDto>[]> {
    return await this.playerSkillService.getAll();
  }

  @Get(':id/skill')
  @Auth(PlayerRole.admin)
  async getPlayerSkill(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<{ [gameClass in Tf2ClassName]?: number }> {
    const skill = await this.playerSkillService.getPlayerSkill(player.id);
    if (skill) {
      return Object.fromEntries(skill);
    } else {
      throw new NotFoundException();
    }
  }

  @Put(':id/skill')
  @Auth(PlayerRole.admin)
  async setPlayerSkill(
    @Param('id', PlayerByIdPipe) player: Player,
    @Body() newSkill: { [className in Tf2ClassName]?: number }, // TODO validate
    @User() user: Player,
  ): Promise<{ [gameClass in Tf2ClassName]?: number }> {
    const newSkillAsMap = new Map(Object.entries(newSkill)) as Map<
      Tf2ClassName,
      number
    >;
    const skill = await this.playerSkillService.setPlayerSkill(
      player.id,
      newSkillAsMap,
      user.id,
    );
    return Object.fromEntries(skill);
  }

  @Get(':id/bans')
  @Auth(PlayerRole.admin)
  async getPlayerBans(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<Serializable<PlayerBanDto>[]> {
    return await this.playerBansService.getPlayerBans(player.id);
  }

  @Post(':id/bans')
  @Auth(PlayerRole.admin)
  @UsePipes(ValidationPipe)
  async addPlayerBan(
    @Body() playerBan: PlayerBan,
    @User() user: Player,
  ): Promise<Serializable<PlayerBanDto>> {
    if (playerBan.admin.toString() !== user.id) {
      throw new BadRequestException(
        "the admin field must be the same as authorized user's id",
      );
    }
    return await this.playerBansService.addPlayerBan(playerBan);
  }

  @Post(':playerId/bans/:banId')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async updatePlayerBan(
    @Param('playerId', PlayerByIdPipe) player: Player,
    @Param('banId', ObjectIdValidationPipe) banId: string,
    @Query('revoke') revoke: any,
    @User() user: Player,
  ): Promise<Serializable<PlayerBanDto>> {
    const ban = await this.playerBansService.getById(banId);
    if (!ban) {
      throw new NotFoundException('ban not found');
    }

    if (ban.player.toString() !== player.id) {
      throw new BadRequestException("the given ban is not of the user's");
    }

    if (revoke !== undefined) {
      return await this.playerBansService.revokeBan(banId, user.id);
    }
  }

  @Get(':id/linked-profiles')
  async getPlayerLinkedProfiles(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<LinkedProfilesDto> {
    const linkedProfiles = await this.linkedProfilesService.getLinkedProfiles(
      player.id,
    );
    return { playerId: player.id, linkedProfiles };
  }
}
