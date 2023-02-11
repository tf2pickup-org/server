import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Patch,
  Body,
  BadRequestException,
  Query,
  Put,
  Post,
  UsePipes,
  ValidationPipe,
  HttpCode,
  UseInterceptors,
  CacheInterceptor,
  CacheTTL,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  Delete,
} from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import { Player } from '../models/player';
import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerBansService } from '../services/player-bans.service';
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
import { PlayerSkillWrapper } from './player-skill-wrapper';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { ImportExportSkillService } from '../services/import-export-skill.service';
import { ImportSkillsResponseDto } from '../dto/import-skills-response.dto';
import { PlayerSkillRecordMalformedError } from '../errors/player-skill-record-malformed.error';
import { ValidateSkillPipe } from '../pipes/validate-skill.pipe';
import { isUndefined } from 'lodash';
import { PlayerBanId } from '../types/player-ban-id';
import { AddPlayerBanDto } from '../dto/add-player-ban.dto';
import { Types } from 'mongoose';
import { PlayerId } from '../types/player-id';

@Controller('players')
export class PlayersController {
  constructor(
    private playersService: PlayersService,
    private playerBansService: PlayerBansService,
    private linkedProfilesService: LinkedProfilesService,
    private readonly importExportSkillService: ImportExportSkillService,
  ) {}

  @Get()
  async getAllPlayers(): Promise<Serializable<PlayerDto>[]> {
    return await this.playersService.getAll();
  }

  // skipcq: JS-0105
  @Get(':id')
  getPlayer(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Serializable<PlayerDto> {
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
    return await this.playersService.updatePlayer(
      player._id,
      update,
      admin._id,
    );
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30 * 60 * 1000) // 30 minutes
  @Get(':id/stats')
  async getPlayerStats(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<PlayerStatsDto> {
    const stats = await this.playersService.getPlayerStats(player._id);
    return {
      player: stats.player.toString(),
      gamesPlayed: stats.gamesPlayed,
      classesPlayed: stats.classesPlayed,
    };
  }

  @Get('/all/skill')
  @Auth(PlayerRole.admin)
  async getAllPlayersWithSkills(): Promise<Serializable<PlayerSkillDto>[]> {
    return (await this.playersService.getAll()).map(
      (player) => new PlayerSkillWrapper(player),
    );
  }

  // skipcq: JS-0105
  @Get(':id/skill')
  @Auth(PlayerRole.admin)
  getPlayerSkill(@Param('id', PlayerByIdPipe) player: Player): {
    [gameClass in Tf2ClassName]?: number;
  } {
    return player.skill ? Object.fromEntries(player.skill) : {};
  }

  @Put(':id/skill')
  @Auth(PlayerRole.admin)
  async setPlayerSkill(
    @Param('id', PlayerByIdPipe) player: Player,
    @Body(ValidateSkillPipe) skill: { [className in Tf2ClassName]?: number },
    @User() admin: Player,
  ): Promise<{ [gameClass in Tf2ClassName]?: number }> {
    const newPlayer = await this.playersService.updatePlayer(
      player._id,
      {
        $set: {
          skill,
        },
      },
      admin._id,
    );
    return Object.fromEntries(newPlayer.skill ?? new Map());
  }

  @Delete(':id/skill')
  @Auth(PlayerRole.admin)
  @HttpCode(204)
  async deletePlayerSkill(
    @Param('id', PlayerByIdPipe) player: Player,
    @User() admin: Player,
  ): Promise<void> {
    await this.playersService.updatePlayer(
      player._id,
      {
        $unset: { skill: 1 },
      },
      admin._id,
    );
  }

  @Get(':id/bans')
  @Auth(PlayerRole.admin)
  async getPlayerBans(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<Serializable<PlayerBanDto>[]> {
    return await this.playerBansService.getPlayerBans(player._id);
  }

  @Post(':id/bans')
  @Auth(PlayerRole.admin)
  @UsePipes(ValidationPipe)
  async addPlayerBan(
    @Body() playerBan: AddPlayerBanDto,
    @User() user: Player,
  ): Promise<Serializable<PlayerBanDto>> {
    if (playerBan.admin !== user.id) {
      throw new BadRequestException(
        "the admin field must be the same as authorized user's id",
      );
    }
    return await this.playerBansService.addPlayerBan({
      player: new Types.ObjectId(playerBan.player) as PlayerId,
      admin: new Types.ObjectId(playerBan.admin) as PlayerId,
      start: new Date(playerBan.start),
      end: new Date(playerBan.end),
      reason: playerBan.reason,
    });
  }

  @Post(':playerId/bans/:banId')
  @Auth(PlayerRole.admin)
  @HttpCode(200)
  async updatePlayerBan(
    @Param('playerId', PlayerByIdPipe) player: Player,
    @Param('banId', ObjectIdValidationPipe) banId: PlayerBanId,
    @Query('revoke') revoke: void,
    @User() user: Player,
  ): Promise<Serializable<PlayerBanDto>> {
    const ban = await this.playerBansService.getById(banId);
    if (!ban) {
      throw new NotFoundException('ban not found');
    }

    if (ban.player.toString() !== player.id) {
      throw new BadRequestException("the given ban is not of the user's");
    }

    if (!isUndefined(revoke)) {
      return await this.playerBansService.revokeBan(banId, user._id);
    }

    throw new BadRequestException('action must be specified');
  }

  @Get(':id/linked-profiles')
  async getPlayerLinkedProfiles(
    @Param('id', PlayerByIdPipe) player: Player,
  ): Promise<LinkedProfilesDto> {
    const linkedProfiles = await this.linkedProfilesService.getLinkedProfiles(
      player._id,
    );
    return { playerId: player.id, linkedProfiles };
  }

  @Post('import-skills')
  @Auth(PlayerRole.admin)
  @UseInterceptors(FileInterceptor('skills'))
  async importSkills(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'csv' })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportSkillsResponseDto> {
    try {
      let noImported = 0;

      const parser = Readable.from(file.buffer).pipe(parse());
      for await (const record of parser) {
        await this.importExportSkillService.importRawSkillRecord(record);
        noImported += 1;
      }

      return {
        noImported,
      };
    } catch (error) {
      if (error instanceof PlayerSkillRecordMalformedError) {
        throw new BadRequestException(error.toString());
      } else {
        throw error;
      }
    }
  }
}
