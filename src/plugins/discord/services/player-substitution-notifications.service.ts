import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Message } from 'discord.js';
import { substituteRequest } from '../notifications';
import { DiscordService } from './discord.service';

@Injectable()
export class PlayerSubstitutionNotificationsService implements OnModuleInit {
  private notifications = new Map<string, Message>(); // playerId <-> message pairs

  constructor(
    private readonly events: Events,
    private readonly discordService: DiscordService,
    private readonly gamesService: GamesService,
    private readonly environment: Environment,
  ) {}

  onModuleInit() {
    this.events.substituteRequested.subscribe(
      async ({ gameId, playerId }) =>
        await this.notifySubstituteRequested(gameId, playerId),
    );
    this.events.substituteRequestCanceled.subscribe(
      async ({ playerId }) => await this.deleteNotification(playerId),
    );
    this.events.playerReplaced.subscribe(
      async ({ replaceeId }) => await this.deleteNotification(replaceeId),
    );
  }

  async notifySubstituteRequested(gameId: string, playerId: string) {
    const channel = this.discordService.getPlayersChannel();
    if (channel) {
      const game = await this.gamesService.getById(gameId);
      const slot = game.findPlayerSlot(playerId);

      const embed = substituteRequest({
        gameNumber: game.number,
        gameClass: slot.gameClass,
        team: slot.team.toUpperCase(),
        gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
      });
      const roleToMention = this.discordService.findRole(
        this.environment.discordQueueNotificationsMentionRole,
      );
      const message = roleToMention?.mentionable
        ? await channel.send({
            content: `${roleToMention}`,
            embeds: [embed],
          })
        : await channel.send({ embeds: [embed] });
      this.notifications.set(playerId, message);
    }
  }

  async deleteNotification(playerId: string) {
    const message = this.notifications.get(playerId);
    if (message) {
      await message.delete();
      this.notifications.delete(playerId);
    }
  }
}
