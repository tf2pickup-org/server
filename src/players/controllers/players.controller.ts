import { Controller, Get, Param, NotFoundException, Patch, Body, BadRequestException, ParseIntPipe, Query, Put, Post, UsePipes, ValidationPipe,
  HttpCode } from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Player } from '../models/player';
import { Auth } from '@/auth/decorators/auth.decorator';
import { GamesService } from '@/games/services/games.service';
import { PlayerSkillService } from '../services/player-skill.service';
import { PlayerBansService } from '../services/player-bans.service';
import { PlayerBan } from '../models/player-ban';
import { User } from '@/auth/decorators/user.decorator';

@Controller('players')
export class PlayersController {

  constructor(
    private playersService: PlayersService,
    private gamesService: GamesService,
    private playerSkillService: PlayerSkillService,
    private playerBansService: PlayerBansService,
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
      return skill.skill;
    } else {
      throw new NotFoundException();
    }
  }

  @Put(':id/skill')
  @Auth('admin', 'super-user')
  // todo validate skill
  async setPlayerSkill(@Param('id', ObjectIdValidationPipe) playerId: string, @Body() newSkill: { [className: string]: number }) {
    return (await this.playerSkillService.setPlayerSkill(playerId, new Map(Object.entries(newSkill)))).skill;
  }

  @Get(':id/bans')
  @Auth('admin', 'super-user')
  async getPlayerBans(@Param('id', ObjectIdValidationPipe) playerId: string) {
    return await this.playerBansService.getPlayerBans(playerId);
  }

  @Post(':id/bans')
  @Auth('admin', 'super-user')
  @UsePipes(ValidationPipe)
  async addPlayerBan(@Param('id', ObjectIdValidationPipe) playerId: string, @Body() playerBan: PlayerBan, @User() user: Player) {
    if (playerBan.admin.toString() !== user.id) {
      throw new BadRequestException('the admin field must be the same as authorized user\'s id');
    }
    return await this.playerBansService.addPlayerBan(playerBan);
  }

  @Post(':playerId/bans/:banId')
  @Auth('admin', 'super-user')
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
