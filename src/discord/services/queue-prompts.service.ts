import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { PlayersService } from '@/players/services/players.service';
import { QueueSlot } from '@/queue/queue-slot';
import { QueueService } from '@/queue/services/queue.service';
import { iconUrlPath } from '@configs/discord';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { groupBy } from 'lodash';
import { queuePreview } from '../notifications';
import { DiscordService } from './discord.service';

@Injectable()
export class QueuePromptsService implements OnModuleInit {

  constructor(
    private events: Events,
    private discordService: DiscordService,
    private environment: Environment,
    private queueService: QueueService,
    private playersService: PlayersService,
  ) { }

  onModuleInit() {
    this.events.queueSlotsChange.subscribe(async ({ slots }) => {
      const clientName = new URL(this.environment.clientUrl).hostname;
      const role = this.discordService.findRole(this.environment.discordQueueNotificationsMentionRole);
      const message = `**${this.queueService.playerCount}/${this.queueService.requiredPlayerCount} players in the queue!**`;
      const content = role.mentionable ? `${role} ${message}` : message;

      const embed = queuePreview({ iconUrl: iconUrlPath, clientName, gameClassData: [] });

      this.discordService.getPlayersChannel()?.send(content, { embed });
    });
  }

  private async slotsToGameClassData(slots: QueueSlot[]) {
    const playerData = await Promise.all(slots
      .map(slot => this.playersService.getById(slot.playerId)
      .then(player => ({ name: player.name, gameClass: slot.gameClass }))
    ));
  }

}
