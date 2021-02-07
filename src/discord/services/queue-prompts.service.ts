import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { PlayersService } from '@/players/services/players.service';
import { QueueSlot } from '@/queue/queue-slot';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { QueueService } from '@/queue/services/queue.service';
import { iconUrlPath } from '@configs/discord';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Message } from 'discord.js';
import { queuePreview } from '../notifications';
import { DiscordService } from './discord.service';

@Injectable()
export class QueuePromptsService implements OnModuleInit {

  private message?: Message;

  constructor(
    private events: Events,
    private discordService: DiscordService,
    private environment: Environment,
    private queueService: QueueService,
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
  ) { }

  onModuleInit() {
    this.events.queueSlotsChange.subscribe(({ slots }) => this.sendPrompt(slots, { pingPlayers: false }));
  }

  private async sendPrompt(slots: QueueSlot[], options: { pingPlayers: boolean }) {
    const clientName = new URL(this.environment.clientUrl).hostname;
    const role = this.discordService.findRole(this.environment.discordQueueNotificationsMentionRole);
    const message = `**${this.queueService.playerCount}/${this.queueService.requiredPlayerCount} players in the queue!**`;
    const content = role.mentionable ? `${role} ${message}` : message;

    const embed = queuePreview({
      iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
      clientName,
      gameClassData: await this.slotsToGameClassData(slots),
    });

    if (this.message && !options.pingPlayers) {
      this.message.edit(content, { embed });
    } else {
      if (this.message) {
        this.message.delete();
      }

      this.message = await this.discordService.getPlayersChannel()?.send(content, { embed });
    }
  }

  private async slotsToGameClassData(slots: QueueSlot[]) {
    const playerData = await Promise.all(slots
      .map(slot => this.playersService.getById(slot.playerId).then(player => ({ name: player.name, gameClass: slot.gameClass })))
    );

    return this.queueConfigService.queueConfig.classes
      .map(gameClass => ({
        gameClass: gameClass.name,
        emoji: this.discordService.findEmoji(`tf2${gameClass.name}`),
        playersRequired: gameClass.count * this.queueConfigService.queueConfig.teamCount,
        players: playerData.filter(p => p.gameClass === gameClass.name),
      }));
  }

}
