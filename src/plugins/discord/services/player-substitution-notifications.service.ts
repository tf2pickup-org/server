import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Snowflake } from 'discord.js';
import { substituteRequest } from '../notifications';
import { DiscordService } from './discord.service';

const cacheKeyForPlayer = (playerId: string) =>
  `player-substitute-notifications/${playerId}`;

@Injectable()
export class PlayerSubstitutionNotificationsService implements OnModuleInit {
  constructor(
    private readonly events: Events,
    private readonly discordService: DiscordService,
    private readonly gamesService: GamesService,
    private readonly environment: Environment,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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
      await this.cache.set(cacheKeyForPlayer(playerId), message.id, { ttl: 0 });
    }
  }

  async deleteNotification(playerId: string) {
    const messageId = await this.cache.get(cacheKeyForPlayer(playerId));
    if (!messageId) {
      return;
    }

    const message = await this.discordService
      .getPlayersChannel()
      .messages.fetch(messageId as Snowflake);
    if (!message) {
      return;
    }

    await message.delete();
    await this.cache.del(cacheKeyForPlayer(playerId));
  }
}
