import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { Serializable } from '@/shared/serializable';
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PlayerActionDto } from '../dto/player-action.dto';
import { PlayerActionEntry } from '../models/player-action-entry';
import { ParseFiltersPipe } from '../pipes/parse-filters.pipe';
import { PlayerActionsRepositoryService } from '../services/player-actions-repository.service';

@Controller('player-action-logs')
// @Auth(PlayerRole.superUser)
export class PlayerActionLogsController {
  constructor(
    private readonly playerActionsRepositoryService: PlayerActionsRepositoryService,
  ) {}

  @Get('/')
  async getPlayerActionLogs(
    @Query('limit', new DefaultValuePipe<number>(10), ParseIntPipe)
    limit: number,
    @Query('filter', ParseFiltersPipe) filters: FilterQuery<PlayerActionEntry>,
  ): Promise<Serializable<PlayerActionDto>[]> {
    return await this.playerActionsRepositoryService.get({
      limit,
      filters,
    });
  }
}
