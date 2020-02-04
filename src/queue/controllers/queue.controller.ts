import { Controller, Get } from '@nestjs/common';
import { QueueConfigService } from '../services/queue-config.service';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';

@Controller('queue')
export class QueueController {

  constructor(
    private queueConfigService: QueueConfigService,
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private queueAnnouncementsService: QueueAnnouncementsService,
    private friendsService: FriendsService,
  ) { }

  @Get()
  async getQueue() {
    return {
      config: this.queueConfigService.queueConfig,
      slots: this.queueService.slots,
      state: this.queueService.state,
      mapVoteResults: this.mapVoteService.results,
      substituteRequests: await this.queueAnnouncementsService.substituteRequests(),
      friendships: this.friendsService.friendships,
    };
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
  getQueueSlots() {
    return this.queueService.slots;
  }

  @Get('map_vote_results')
  getMapVoteResults() {
    return this.mapVoteService.results;
  }

  @Get('announcements')
  async getSubstituteRequests() {
    return this.queueAnnouncementsService.substituteRequests();
  }

  @Get('friendships')
  getFriendships() {
    return this.friendsService.friendships;
  }

}
