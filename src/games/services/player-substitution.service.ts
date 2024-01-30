import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { QueueService } from '@/queue/services/queue.service';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Game } from '../models/game';
import { plainToInstance } from 'class-transformer';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { merge } from 'rxjs';
import { Mutex } from 'async-mutex';
import { GameId } from '../types/game-id';
import { PlayerId } from '@/players/types/player-id';
import { GameEventType } from '../models/game-event-type';
import {
  DenyReason,
  PlayerDeniedError,
} from '@/shared/errors/player-denied.error';

/**
 * A service that handles player substitution logic.
 */
@Injectable()
export class PlayerSubstitutionService implements OnModuleInit {
  private logger = new Logger(PlayerSubstitutionService.name);
  private mutex = new Mutex();

  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
    @Inject(forwardRef(() => PlayersService))
    private readonly playersService: PlayersService,
    private readonly queueService: QueueService,
    private readonly events: Events,
    @InjectModel(Game.name) private readonly gameModel: Model<Game>,
  ) {}

  onModuleInit() {
    // all substitute events trigger the substituteRequestsChange event
    merge(
      this.events.substituteRequested,
      this.events.substituteRequestCanceled,
      this.events.playerReplaced,
    ).subscribe(() => this.events.substituteRequestsChange.next());
  }

  async substitutePlayer(
    gameId: GameId,
    playerId: PlayerId,
    actorId: PlayerId,
    reason?: string,
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

      if (slot.status === SlotStatus.waitingForSubstitute) {
        return game;
      }

      const player = await this.playersService.getById(playerId);
      const actor = await this.playersService.getById(actorId);

      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              $set: {
                'slots.$[element].status': SlotStatus.waitingForSubstitute,
              },
              $push: {
                events: {
                  event: GameEventType.substituteRequested,
                  at: new Date(),
                  player: player._id,
                  gameClass: slot.gameClass,
                  actor: actor._id,
                  reason,
                },
              },
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

      this.logger.log(
        `player ${player.name} taking part in game #${
          game.number
        } is subbed by ${actor.name}${reason ? ` (reason: ${reason})` : ''}`,
      );

      this.events.gameChanges.next({ oldGame: game, newGame });
      this.events.substituteRequested.next({
        gameId,
        playerId,
        adminId: actorId,
      });
      return newGame;
    });
  }

  async cancelSubstitutionRequest(
    gameId: GameId,
    playerId: PlayerId,
    adminId?: PlayerId,
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
      return newGame;
    });
  }

  async replacePlayer(
    gameId: GameId,
    replaceeId: PlayerId,
    replacementId: PlayerId,
  ) {
    return await this.mutex.runExclusive(async () => {
      const replacement = await this.playersService.getById(replacementId);
      const game = await this.gamesService.getById(gameId);
      const slot = game.slots.find(
        (slot) =>
          slot.status === SlotStatus.waitingForSubstitute &&
          slot.player.equals(replaceeId),
      );

      if (!slot) {
        throw new PlayerNotInThisGameError(replaceeId, gameId);
      }

      if (replaceeId.equals(replacementId)) {
        const newGame = plainToInstance(
          Game,
          await this.gameModel
            .findByIdAndUpdate(
              gameId,
              {
                $set: {
                  'slots.$[element].status': SlotStatus.active,
                },
                $push: {
                  events: {
                    at: new Date(),
                    event: GameEventType.playerReplaced,
                    replacee: replaceeId,
                    replacement: replacementId,
                  },
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
        this.logger.verbose('player has taken his own slot');
        return newGame;
      }

      if (replacement.activeGame) {
        throw new PlayerDeniedError(
          replacement,
          DenyReason.playerIsInvolvedInGame,
        );
      }

      // create new slot of the replacement player and update the old slot
      await this.gameModel.findByIdAndUpdate(gameId, {
        $push: {
          slots: {
            player: replacementId,
            team: slot.team,
            gameClass: slot.gameClass,
            status: SlotStatus.active,
          },
          events: {
            event: GameEventType.playerReplaced,
            at: new Date(),
            replacee: replaceeId,
            replacement: replacementId,
          },
        },
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
                {
                  $and: [
                    { 'element.player': { $eq: replaceeId } },
                    {
                      'element.status': {
                        $eq: SlotStatus.waitingForSubstitute,
                      },
                    },
                  ],
                },
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
      const replacementSlot = newGame.findPlayerSlot(replacementId);

      this.logger.verbose(
        `player ${replacement.name} is replacing ${replacee.name} on ${
          replacementSlot!.gameClass
        } in game #${newGame.number}`,
      );

      await this.playersService.updatePlayer(replacement._id, {
        activeGame: newGame.id,
      });
      await this.playersService.updatePlayer(replacee._id, {
        $unset: { activeGame: 1 },
      });
      return newGame;
    });
  }
}
