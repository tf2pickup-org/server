import { Controller, Get, Param, NotFoundException, Patch, Body, BadRequestException, ParseIntPipe, Query, Put, Post, UsePipes, ValidationPipe,
  HttpCode, Header, UseInterceptors, CacheInterceptor, CacheTTL, ClassSerializerInterceptor, UseFilters } from '@nestjs/common';
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
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { PlayerStats } from '../dto/player-stats';

@Controller('players')
@UseInterceptors(CacheInterceptor)
export class PlayersController {

  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerSkillService: PlayerSkillService,
    private playerBansService: PlayerBansService,
  ) { }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async getAllPlayers() {
    return await this.playersService.getAll();
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getPlayer(@Param('id', ObjectIdValidationPipe) playerId: string) {
    const player = await this.playersService.getById(playerId);
    if (player) {
      return player;
    } else {
      throw new NotFoundException();
    }
  }

  @Post()
  @Auth('admin', 'super-user')
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  async forceCreatePlayer(@Body() player: Player) {
    return await this.playersService.forceCreatePlayer(player);
  }

  @Patch(':id')
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  async updatePlayer(@Param('id', ObjectIdValidationPipe) playerId: string, @Body() player: Partial<Player>, @User() user: Player) {
    return await this.playersService.updatePlayer(playerId, player, user.id);
  }

  @Get(':id/games')
  @Header('Warning', '299 - "Deprecated API"')
  async getPlayerGames(@Param('id', ObjectIdValidationPipe) playerId: string, @Query('limit', ParseIntPipe) limit = 10,
                       @Query('offset', ParseIntPipe) offset = 0, @Query('sort') sort = '-launched_at') {
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

  @CacheTTL(12 * 60 * 60)
  @Get(':id/stats')
  @UseInterceptors(ClassSerializerInterceptor)
  async getPlayerStats(@Param('id', ObjectIdValidationPipe) playerId: string): Promise<PlayerStats> {
    return await this.playersService.getPlayerStats(playerId);
  }

  @Get('/all/skill')
  @Auth('admin', 'super-user')
  async getAllPlayerSkills() {
    return await this.playerSkillService.getAll();
  }

  @Get(':id/skill')
  @Auth('admin', 'super-user')
  async getPlayerSkill(@Param('id', ObjectIdValidationPipe) playerId: string) {
    const skill = await this.playerSkillService.getPlayerSkill(playerId);
    if (skill) {
      return skill;
    } else {
      throw new NotFoundException();
    }
  }

  @Put(':id/skill')
  @Auth('admin', 'super-user')
  // todo validate skill
  async setPlayerSkill(
    @Param('id', ObjectIdValidationPipe) playerId: string,
    @Body() newSkill: { [className in Tf2ClassName]?: number },
    @User() user: Player,
  ) {
    const newSkillAsMap = new Map(Object.entries(newSkill)) as Map<Tf2ClassName, number>;
    return this.playerSkillService.setPlayerSkill(playerId, newSkillAsMap, user.id);
  }

  @Get(':id/bans')
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  async getPlayerBans(@Param('id', ObjectIdValidationPipe) playerId: string) {
    return await this.playerBansService.getPlayerBans(playerId);
  }

  @Post(':id/bans')
  @Auth('admin', 'super-user')
  @UsePipes(ValidationPipe)
  @UseInterceptors(ClassSerializerInterceptor)
  async addPlayerBan(@Body() playerBan: PlayerBan, @User() user: Player) {
    if (playerBan.admin.toString() !== user.id) {
      throw new BadRequestException('the admin field must be the same as authorized user\'s id');
    }
    return await this.playerBansService.addPlayerBan(playerBan);
  }

  @Post(':playerId/bans/:banId')
  @Auth('admin', 'super-user')
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(200)
  async updatePlayerBan(@Param('playerId', ObjectIdValidationPipe) playerId: string, @Param('banId', ObjectIdValidationPipe) banId: string,
                        @Query('revoke') revoke: any, @User() user: Player) {
    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new NotFoundException('player not found');
    }

    const ban = await this.playerBansService.getById(banId);
    if (!ban) {
      throw new NotFoundException('ban not found');
    }

    if (ban.player.toString() !== playerId) {
      throw new BadRequestException('the given ban is not of the user\'s');
    }

    if (revoke !== undefined) {
      return this.playerBansService.revokeBan(banId, user.id);
    }
  }

}
