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
import { GameRuntimeService } from './game-runtime.service';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/plugins/discord/services/discord.service';
import { substituteRequest } from '@/plugins/discord/notifications';
import { Environment } from '@/environment/environment';
import { Message, Role, TextChannel } from 'discord.js';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from '../models/game';
import { plainToClass } from 'class-transformer';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { WrongGameSlotStatusError } from '../errors/wrong-game-slot-status.error';
import { merge } from 'rxjs';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GameSlot } from '../models/game-slot';

/**
 * A service that handles player substitution logic.
 */
@Injectable()
export class PlayerSubstitutionService implements OnModuleInit {
  private logger = new Logger(PlayerSubstitutionService.name);
  private discordNotifications = new Map<string, Message[]>(); // playerId <-> message pairs

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
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private configurationService: ConfigurationService,
  ) {
    this.logger.verbose(
      `Discord plugin will ${this.discordService ? '' : 'not '}be used`,
    );
  }

  onModuleInit() {
    // all substitute events trigger the substituteRequestsChange event
    merge(
      this.events.substituteRequested,
      this.events.substituteCanceled,
      this.events.playerReplaced,
    ).subscribe(() => this.events.substituteRequestsChange.next());
  }

  /**
   * Mark the given player as replaceable.
   */
  async substitutePlayer(
    gameId: string,
    playerId: string,
    adminId?: string,
  ): Promise<Game> {
    let game = await this.gamesService.getById(gameId);
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
    game = plainToClass(
      Game,
      await this.gameModel
        .findByIdAndUpdate(
          game.id,
          {
            'slots.$[element].status': SlotStatus.waitingForSubstitute,
          },
          {
            new: true,
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        .orFail()
        .lean()
        .exec(),
    );

    this.logger.debug(
      `player ${player.name} taking part in game #${game.number} is marked as 'waiting for substitute'`,
    );

    this.events.gameChanges.next({ game });
    this.events.substituteRequested.next({ gameId, playerId, adminId });
    this.discordAnnounceSubstituteNeeded(game, slot);

    if (game.gameServer) {
      this.gameRuntimeService.sayChat(
        game.gameServer.toString(),
        `Looking for replacement for ${player.name}...`,
      );
    }

    return game;
  }

  async cancelSubstitutionRequest(
    gameId: string,
    playerId: string,
    adminId?: string,
  ) {
    let game = await this.gamesService.getById(gameId);
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

    game = plainToClass(
      Game,
      await this.gameModel
        .findByIdAndUpdate(
          gameId,
          {
            'slots.$[element].status': SlotStatus.active,
          },
          {
            new: true,
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        .orFail()
        .lean()
        .exec(),
    );

    this.events.gameChanges.next({ game });
    this.events.substituteCanceled.next({ gameId, playerId, adminId });

    await Promise.all(
      this.discordNotifications
        .get(playerId)
        ?.map((message) =>
          message.delete({ reason: 'substitution request canceled' }),
        ),
    );
    this.discordNotifications.delete(playerId);

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

    let game = await this.gamesService.getById(gameId);
    const slot = game.slots.find(
      (slot) =>
        slot.status === SlotStatus.waitingForSubstitute &&
        slot.player.equals(replaceeId),
    );

    if (!slot) {
      throw new PlayerNotInThisGameError(replaceeId, gameId);
    }

    if (replaceeId === replacementId) {
      game = plainToClass(
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

      this.events.gameChanges.next({ game });
      this.events.playerReplaced.next({
        gameId,
        replaceeId,
        replacementId,
      });
      await this.deleteDiscordAnnouncement(replaceeId);
      this.logger.verbose(`player has taken his own slot`);
      return game;
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

    game = plainToClass(
      Game,
      await this.gameModel
        .findByIdAndUpdate(
          game.id,
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

    this.events.gameChanges.next({ game });
    this.events.playerReplaced.next({
      gameId,
      replaceeId,
      replacementId,
    });
    this.queueService.kick(replacementId);

    const replacee = await this.playersService.getById(replaceeId);

    if (game.gameServer) {
      this.gameRuntimeService.sayChat(
        game.gameServer.toString(),
        `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
      );
    }

    await this.deleteDiscordAnnouncement(replaceeId);

    this.logger.verbose(
      `player ${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass} in game #${game.number}`,
    );

    await this.playersService.updatePlayer(replacement.id.toString(), {
      activeGame: game.id,
    });

    await this.playersService.updatePlayer(replacee.id.toString(), {
      $unset: { activeGame: 1 },
    });

    if (game.gameServer) {
      this.gameRuntimeService.replacePlayer(
        game.id,
        replaceeId,
        replacementSlot,
      );
    }
    return game;
  }

  private async discordAnnounceSubstituteNeeded(game: Game, slot: GameSlot) {
    const embed = substituteRequest({
      gameNumber: game.number,
      gameClass: slot.gameClass,
      team: slot.team.toUpperCase(),
      gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
    });

    const discordConfig = await this.configurationService.getDiscord();
    await Promise.all(
      discordConfig.guilds
        .filter((g) => g.queueNotificationsChannelId)
        .map((g) => {
          const guild = this.discordService.getGuild(g.guildId);
          if (guild) {
            const channel = guild.channels.cache.get(
              g.queueNotificationsChannelId,
            ) as TextChannel;

            let role: Role = null;
            if (g.substituteMentionRole) {
              role = guild.roles.cache.get(g.substituteMentionRole);
            }

            return { channel, role };
          } else {
            return null;
          }
        })
        .filter((c) => c !== null)
        .filter(({ channel }) => channel !== null)
        .map(async ({ channel, role }) => {
          let message: Message;
          if (role?.mentionable) {
            message = await channel.send(`${role}`, { embed });
          } else {
            message = await channel.send({ embed });
          }

          const a = this.discordNotifications.get(slot.player.toString()) ?? [];
          a.push(message);
          this.discordNotifications.set(slot.player.toString(), a);
        }),
    );
  }

  private async deleteDiscordAnnouncement(replaceeId: string) {
    await Promise.all(
      this.discordNotifications
        .get(replaceeId)
        ?.map((message) => message.delete()),
    );
    this.discordNotifications.delete(replaceeId);
  }
}
