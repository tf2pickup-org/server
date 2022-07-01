import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/plugins/discord/services/discord.service';
import { substituteRequest } from '@/plugins/discord/notifications';
import { Environment } from '@/environment/environment';
import { Message } from 'discord.js';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from '../models/game';
import { plainToInstance } from 'class-transformer';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { WrongGameSlotStatusError } from '../errors/wrong-game-slot-status.error';
import { merge } from 'rxjs';
import { Mutex } from 'async-mutex';

/**
 * A service that handles player substitution logic.
 */
@Injectable()
export class PlayerSubstitutionService implements OnModuleInit {
  private logger = new Logger(PlayerSubstitutionService.name);
  private discordNotifications = new Map<string, Message>(); // playerId <-> message pairs
  private mutex = new Mutex();

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private playerBansService: PlayerBansService,
    private queueService: QueueService,
    @Optional() private discordService: DiscordService,
    private environment: Environment,
    private events: Events,
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {
    this.logger.verbose(
      `Discord plugin will ${this.discordService ? '' : 'not '}be used`,
    );
  }

  onModuleInit() {
    // all substitute events trigger the substituteRequestsChange event
    merge(
      this.events.substituteRequested,
      this.events.substituteRequestCanceled,
      this.events.playerReplaced,
    ).subscribe(() => this.events.substituteRequestsChange.next());
  }

  async substitutePlayer(gameId: string, playerId: string, adminId?: string) {
    return await this.mutex.runExclusive(async () => {
      const game = await this.gamesService.getById(gameId);
      const slot = game.findPlayerSlot(playerId);
      if (!slot) {
        throw new PlayerNotInThisGameError(playerId, gameId);
      }

      if (!game.isInProgress()) {
        throw new GameInWrongStateError(gameId, game.state);
      }

      if (slot.status === SlotStatus.replaced) {
        throw new WrongGameSlotStatusError(gameId, playerId, slot.status);
      }

      if (slot.status === SlotStatus.waitingForSubstitute) {
        return game;
      }

      const player = await this.playersService.getById(playerId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              'slots.$[element].status': SlotStatus.waitingForSubstitute,
            },
            {
              new: true,
              arrayFilters: [
                { 'element.player': { $eq: new Types.ObjectId(player.id) } },
              ],
            },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.logger.debug(
        `player ${player.name} taking part in game #${game.number} is marked as 'waiting for substitute'`,
      );

      this.events.gameChanges.next({ oldGame: game, newGame });
      this.events.substituteRequested.next({ gameId, playerId, adminId });

      const channel = this.discordService?.getPlayersChannel();
      if (channel) {
        const embed = substituteRequest({
          gameNumber: newGame.number,
          gameClass: slot.gameClass,
          team: slot.team.toUpperCase(),
          gameUrl: `${this.environment.clientUrl}/game/${newGame.id}`,
        });

        const roleToMention = this.discordService.findRole(
          this.environment.discordQueueNotificationsMentionRole,
        );
        let message: Message; // skipcq: JS-0309

        if (roleToMention?.mentionable) {
          message = await channel.send({
            content: `${roleToMention.toString()}`,
            embeds: [embed],
          });
        } else {
          message = await channel.send({ embeds: [embed] });
        }

        this.discordNotifications.set(playerId, message);
      }

      return newGame;
    });
  }

  async cancelSubstitutionRequest(
    gameId: string,
    playerId: string,
    adminId?: string,
  ) {
    return await this.mutex.runExclusive(async () => {
      const game = await this.gamesService.getById(gameId);
      const slot = game.findPlayerSlot(playerId);
      if (!slot) {
        throw new PlayerNotInThisGameError(playerId, gameId);
      }

      if (!game.isInProgress()) {
        throw new GameInWrongStateError(gameId, game.state);
      }

      if (slot.status === SlotStatus.replaced) {
        throw new WrongGameSlotStatusError(gameId, playerId, slot.status);
      }

      if (slot.status === SlotStatus.active) {
        return game;
      }

      const player = await this.playersService.getById(playerId);
      this.logger.verbose(
        `player ${player.name} taking part in game #${game.number} is marked as 'active'`,
      );

      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              'slots.$[element].status': SlotStatus.active,
            },
            {
              new: true,
              arrayFilters: [
                { 'element.player': { $eq: new Types.ObjectId(player.id) } },
              ],
            },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.events.gameChanges.next({ oldGame: game, newGame });
      this.events.substituteRequestCanceled.next({ gameId, playerId, adminId });

      const message = this.discordNotifications.get(playerId);
      if (message) {
        await message.delete();
        this.discordNotifications.delete(playerId);
      }

      return newGame;
    });
  }

  async replacePlayer(
    gameId: string,
    replaceeId: string,
    replacementId: string,
  ) {
    return await this.mutex.runExclusive(async () => {
      const replacement = await this.playersService.getById(replacementId);

      if (
        (await this.playerBansService.getPlayerActiveBans(replacementId))
          .length > 0
      ) {
        throw new Error('player is banned');
      }

      const game = await this.gamesService.getById(gameId);
      const slot = game.slots.find(
        (slot) =>
          slot.status === SlotStatus.waitingForSubstitute &&
          slot.player.equals(replaceeId),
      );

      if (!slot) {
        throw new PlayerNotInThisGameError(replaceeId, gameId);
      }

      if (replaceeId === replacementId) {
        const newGame = plainToInstance(
          Game,
          await this.gameModel
            .findByIdAndUpdate(
              gameId,
              {
                'slots.$[element].status': SlotStatus.active,
              },
              {
                new: true,
                arrayFilters: [
                  { 'element.player': { $eq: new Types.ObjectId(replaceeId) } },
                ],
              },
            )
            .orFail()
            .lean()
            .exec(),
        );

        this.events.gameChanges.next({ oldGame: game, newGame });
        this.events.playerReplaced.next({
          gameId,
          replaceeId,
          replacementId,
        });
        await this.deleteDiscordAnnouncement(replaceeId);
        this.logger.verbose(`player has taken his own slot`);
        return newGame;
      }

      if (replacement.activeGame) {
        throw new Error('player is involved in a currently running game');
      }

      // create new slot of the replacement player
      const replacementSlot = {
        player: new Types.ObjectId(replacementId),
        team: slot.team,
        gameClass: slot.gameClass,
      };

      await this.gameModel.findByIdAndUpdate(gameId, {
        $push: { slots: replacementSlot },
      });

      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              $set: {
                'slots.$[element].status': SlotStatus.replaced,
              },
            },
            {
              new: true,
              arrayFilters: [
                { 'element.player': { $eq: new Types.ObjectId(replaceeId) } },
              ],
            },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.events.gameChanges.next({ oldGame: game, newGame });
      this.events.playerReplaced.next({
        gameId,
        replaceeId,
        replacementId,
      });
      this.queueService.kick(replacementId);

      const replacee = await this.playersService.getById(replaceeId);

      this.logger.verbose(
        `player ${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass} in game #${newGame.number}`,
      );

      await this.playersService.updatePlayer(replacement.id.toString(), {
        activeGame: newGame.id,
      });

      await this.playersService.updatePlayer(replacee.id.toString(), {
        $unset: { activeGame: 1 },
      });

      await this.deleteDiscordAnnouncement(replaceeId);
      return newGame;
    });
  }

  private async deleteDiscordAnnouncement(replaceeId: string) {
    const message = this.discordNotifications.get(replaceeId);
    if (message) {
      await message.delete();
      this.discordNotifications.delete(replaceeId);
    }
  }
}
