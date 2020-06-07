import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GamePlayer } from '../models/game-player';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { QueueService } from '@/queue/services/queue.service';
import { ObjectId } from 'mongodb';

/**
 * A service that handles player substitution logic.
 *
 * @export
 * @class PlayerSubstitutionService
 */
@Injectable()
export class PlayerSubstitutionService {

  private logger = new Logger(PlayerSubstitutionService.name);

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private playerBansService: PlayerBansService,
    @Inject(forwardRef(() => GameRuntimeService)) private gameRuntimeService: GameRuntimeService,
    @Inject(forwardRef(() => GamesGateway)) private gamesGateway: GamesGateway,
    private discordNotificationsService: DiscordNotificationsService,
    private queueGateway: QueueGateway,
    private queueSevice: QueueService,
  ) { }

  async substitutePlayer(gameId: ObjectId, playerId: ObjectId) {
    const { game, slot } = await this.findPlayerSlot(gameId, playerId);

    if (!/launching|started/.test(game.state)) {
      throw new Error('the game has already ended');
    }

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    if (slot.status === 'waiting for substitute') {
      return game;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.debug(`player ${player.name} taking part in game #${game.number} is marked as 'waiting for substitute'`);

    slot.status = 'waiting for substitute';
    await game.save();
    this.gamesGateway.emitGameUpdated(game);
    this.queueGateway.updateSubstituteRequests();
    this.discordNotificationsService.notifySubstituteRequest({
      gameId: game.id,
      gameNumber: game.number,
      gameClass: slot.gameClass,
      team: slot.team,
    });
    return game;
  }

  async cancelSubstitutionRequest(gameId: ObjectId, playerId: ObjectId) {
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
    this.logger.verbose(`player ${player.name} taking part in game #${game.number} is marked as 'active'`);

    slot.status = 'active';
    await game.save();
    this.gamesGateway.emitGameUpdated(game);
    this.queueGateway.updateSubstituteRequests();
    return game;
  }

  async replacePlayer(gameId: ObjectId, replaceeId: ObjectId, replacementId: ObjectId) {
    if ((await this.playerBansService.getPlayerActiveBans(replacementId)).length > 0) {
      throw new Error('player is banned');
    }

    const { game, slot } = await this.findPlayerSlot(gameId, replaceeId);

    if (slot.status === 'active') {
      throw new Error('the replacee is marked as active');
    }

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    if (replaceeId === replacementId) {
      slot.status = 'active';
      await game.save();
      this.gamesGateway.emitGameUpdated(game);
      this.queueGateway.updateSubstituteRequests();
      this.logger.verbose(`player has taken his own slot`);
      return game;
    }

    if (!!await this.gamesService.getPlayerActiveGame(replacementId)) {
      throw new Error('player is involved in a currently running game');
    }

    const replacement = await this.playersService.getById(replacementId);
    if (!replacement) {
      throw new Error('no such player');
    }

    let replacementSlot: GamePlayer = game.slots.find(s => replacementId.equals(s.player as ObjectId));
    if (replacementSlot) {
      replacementSlot.status = 'active';
    } else {
      // create new slot of the replacement player
      replacementSlot = {
        player: replacementId,
        team: slot.team,
        gameClass: slot.gameClass,
        status: 'active',
      };

      game.slots.push(replacementSlot);
      game.players.push(replacement);
    }

    // update replacee
    slot.status = 'replaced';

    await game.save();
    this.gamesGateway.emitGameUpdated(game);
    this.queueGateway.updateSubstituteRequests();
    this.queueSevice.kick(replacementId);

    const replacee = await this.playersService.getById(replaceeId);

    this.gameRuntimeService.sayChat(
      game.gameServer as ObjectId,
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    this.logger.verbose(`player ${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass} in game #${game.number}`);

    setImmediate(() => this.gameRuntimeService.replacePlayer(game.id, replaceeId, replacementSlot));
    return game;
  }

  private async findPlayerSlot(gameId: ObjectId, playerId: ObjectId) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    const slot = game.slots.find(s => playerId.equals(s.player as ObjectId));
    if (!slot) {
      throw new Error('no such player');
    }

    return { game, slot };
  }

}
