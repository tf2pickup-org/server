import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { SlotStatus } from '@/games/models/slot-status';
import { GamesService } from '@/games/services/games.service';
import { PlayerId } from '@/players/types/player-id';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { filter, map } from 'rxjs';
import { substituteRequest } from '../notifications';
import { DiscordService } from './discord.service';

const cacheKeyForPlayer = (playerId: PlayerId) =>
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
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
        map(({ oldGame }) =>
          oldGame.slots.filter(
            (slot) => slot.status === SlotStatus.waitingForSubstitute,
          ),
        ),
      )
      .subscribe(
        async (slots) =>
          await Promise.all(
            slots.map(
              async (slot) => await this.deleteNotification(slot.player),
            ),
          ),
      );
  }

  async notifySubstituteRequested(gameId: GameId, playerId: PlayerId) {
    const channel = this.discordService.getPlayersChannel();
    if (channel) {
      const game = await this.gamesService.getById(gameId);
      const slot = game.findPlayerSlot(playerId);

      if (!slot) {
        return;
      }

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
      await this.cache.set(cacheKeyForPlayer(playerId), message.id, 0);
    }
  }

  async deleteNotification(playerId: PlayerId) {
    const messageId = await this.cache.get<string>(cacheKeyForPlayer(playerId));
    if (!messageId) {
      return;
    }

    const message = await this.discordService
      .getPlayersChannel()
      ?.messages.fetch(messageId);
    if (!message) {
      return;
    }

    await message.delete();
    await this.cache.del(cacheKeyForPlayer(playerId));
  }
}
