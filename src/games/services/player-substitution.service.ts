import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GameRuntimeService } from './game-runtime.service';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/plugins/discord/services/discord.service';
import { substituteRequest } from '@/plugins/discord/notifications';
import { Environment } from '@/environment/environment';
import { Message } from 'discord.js';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Types } from 'mongoose';

/**
 * A service that handles player substitution logic.
 *
 * @export
 * @class PlayerSubstitutionService
 */
@Injectable()
export class PlayerSubstitutionService {
  private logger = new Logger(PlayerSubstitutionService.name);
  private discordNotifications = new Map<string, Message>(); // playerId <-> message pairs

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private playerBansService: PlayerBansService,
    @Inject(forwardRef(() => GameRuntimeService))
    private gameRuntimeService: GameRuntimeService,
    private queueService: QueueService,
    @Optional() private discordService: DiscordService,
    private environment: Environment,
    private events: Events,
  ) {
    this.logger.verbose(
      `Discord plugin will ${this.discordService ? '' : 'not '}be used`,
    );
  }

  async substitutePlayer(gameId: string, playerId: string) {
    const { game, slot } = await this.findPlayerSlot(gameId, playerId);

    if (!/launching|started/.test(game.state)) {
      throw new Error('the game has already ended');
    }

    if (slot.status === SlotStatus.replaced) {
      throw new Error('this player has already been replaced');
    }

    if (slot.status === SlotStatus.waitingForSubstitute) {
      return game;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.debug(
      `player ${player.name} taking part in game #${game.number} is marked as 'waiting for substitute'`,
    );

    slot.status = SlotStatus.waitingForSubstitute;
    await game.save();
    this.events.gameChanges.next({ game: game.toJSON() });
    this.events.substituteRequestsChange.next();

    const channel = this.discordService?.getPlayersChannel();
    if (channel) {
      const embed = substituteRequest({
        gameNumber: game.number,
        gameClass: slot.gameClass,
        team: slot.team.toUpperCase(),
        gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
      });

      const roleToMention = this.discordService.findRole(
        this.environment.discordQueueNotificationsMentionRole,
      );
      let message: Message;

      if (roleToMention?.mentionable) {
        message = await channel.send(`${roleToMention}`, { embed });
      } else {
        message = await channel.send({ embed });
      }

      this.discordNotifications.set(playerId, message);
    }

    return game;
  }

  async cancelSubstitutionRequest(gameId: string, playerId: string) {
    const { game, slot } = await this.findPlayerSlot(gameId, playerId);

    if (!/launching|started/.test(game.state)) {
      throw new Error('the game has already ended');
    }

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    if (slot.status === 'active') {
      return game;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.verbose(
      `player ${player.name} taking part in game #${game.number} is marked as 'active'`,
    );

    slot.status = SlotStatus.active;
    await game.save();
    this.events.gameChanges.next({ game });
    this.events.substituteRequestsChange.next();

    const message = this.discordNotifications.get(playerId);
    if (message) {
      await message.delete({ reason: 'substitution request canceled' });
      this.discordNotifications.delete(playerId);
    }

    return game;
  }

  async replacePlayer(
    gameId: string,
    replaceeId: string,
    replacementId: string,
  ) {
    const replacement = await this.playersService.getById(replacementId);

    if (
      (await this.playerBansService.getPlayerActiveBans(replacementId)).length >
      0
    ) {
      throw new Error('player is banned');
    }

    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    const slot = game.slots.find(
      (slot) =>
        slot.status === SlotStatus.waitingForSubstitute &&
        slot.player.toString().localeCompare(replaceeId) === 0,
    );
    if (!slot) {
      throw new Error(`no such slot (playerId: ${replaceeId})`);
    }

    if (replaceeId === replacementId) {
      slot.status = SlotStatus.active;
      await game.save();
      this.events.gameChanges.next({ game });
      this.events.substituteRequestsChange.next();
      await this.deleteDiscordAnnouncement(replaceeId);
      this.logger.verbose(`player has taken his own slot`);
      return game;
    }

    if (await this.gamesService.getPlayerActiveGame(replacementId)) {
      throw new Error('player is involved in a currently running game');
    }
    // create new slot of the replacement player
    const replacementSlot = {
      player: new Types.ObjectId(replacementId),
      team: slot.team,
      gameClass: slot.gameClass,
    };

    game.slots.push(replacementSlot);

    // update replacee
    slot.status = SlotStatus.replaced;

    await game.save();
    this.events.gameChanges.next({ game });
    this.events.substituteRequestsChange.next();
    this.queueService.kick(replacementId);

    const replacee = await this.playersService.getById(replaceeId);

    this.gameRuntimeService.sayChat(
      game.gameServer.toString(),
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    await this.deleteDiscordAnnouncement(replaceeId);

    this.logger.verbose(
      `player ${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass} in game #${game.number}`,
    );

    await this.playersService.updatePlayer(replacee.id.toString(), {
      $unset: { activeGame: 1 },
    });

    setImmediate(() =>
      this.gameRuntimeService.replacePlayer(
        game.id,
        replaceeId,
        replacementSlot,
      ),
    );
    return game;
  }

  private async findPlayerSlot(gameId: string, playerId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    const slot = game.findPlayerSlot(playerId);
    if (!slot) {
      throw new Error('no such player');
    }

    return { game, slot };
  }

  private async deleteDiscordAnnouncement(replaceeId: string) {
    const message = this.discordNotifications.get(replaceeId);
    if (message) {
      await message.delete();
      this.discordNotifications.delete(replaceeId);
    }
  }
}
