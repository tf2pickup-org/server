import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { QueueConfigService } from '../services/queue-config.service';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { MapPoolService } from '../services/map-pool.service';
import { Auth } from '@/auth/decorators/auth.decorator';
import { Map } from '../models/map';
import { PlayerRole } from '@/players/models/player-role';
import { Serializable } from '@/shared/serializable';
import { QueueSlotDto } from '../dto/queue-slot.dto';
import { QueueSlotWrapper } from './queue-slot-wrapper';
import { QueueDto } from '../dto/queue.dto';
import { QueueWrapper } from './queue-wrapper';

@Controller('queue')
export class QueueController {
  constructor(
    private queueConfigService: QueueConfigService,
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private queueAnnouncementsService: QueueAnnouncementsService,
    private friendsService: FriendsService,
    private mapPoolService: MapPoolService,
  ) {}

  @Get()
  async getQueue(): Promise<Serializable<QueueDto>> {
    return new QueueWrapper({
      config: this.queueConfigService.queueConfig,
      slots: this.queueService.slots,
      state: this.queueService.state,
      mapVoteResults: this.mapVoteService.results,
      substituteRequests:
        await this.queueAnnouncementsService.substituteRequests(),
      friendships: this.friendsService.friendships,
    });
  }

  @Get('config')
  getQueueConfig() {
    return this.queueConfigService.queueConfig;
  }

  @Get('state')
  getQueueState() {
    return this.queueService.state;
  }

  @Get('slots')
  getQueueSlots(): Serializable<QueueSlotDto>[] {
    return this.queueService.slots.map((s) => new QueueSlotWrapper(s));
  }

  @Get('map_vote_results')
  getMapVoteResults() {
    return this.mapVoteService.results;
  }

  @Put('map_vote_results/scramble')
  @Auth(PlayerRole.admin)
  async scrambleMaps() {
    return await this.mapVoteService.scramble();
  }

  @Get('announcements')
  async getSubstituteRequests() {
    return await this.queueAnnouncementsService.substituteRequests();
  }

  @Get('friendships')
  getFriendships() {
    return this.friendsService.friendships;
  }

  @Get('maps')
  async getMaps() {
    return await this.mapPoolService.getMaps();
  }

  @Post('maps')
  @Auth(PlayerRole.admin)
  @UsePipes(ValidationPipe)
  async addMap(@Body() map: Map) {
    return await this.mapPoolService.addMap(map);
  }

  @Delete('maps/:name')
  @Auth(PlayerRole.admin)
  async deleteMap(@Param('name') name: string) {
    return await this.mapPoolService.removeMap(name);
  }

  @Put('maps')
  @Auth(PlayerRole.admin)
  @UsePipes(ValidationPipe)
  async setMaps(@Body() maps: Map[]) {
    return await this.mapPoolService.setMaps(maps);
  }
}
