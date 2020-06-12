import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GamePlayer } from '../models/game-player';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { QueueService } from '@/queue/services/queue.service';
import { DiscordService } from '@/discord/services/discord.service';
import { substituteRequest } from '@/discord/notifications';
import { Environment } from '@/environment/environment';

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
    private queueGateway: QueueGateway,
    private queueSevice: QueueService,
    private discordService: DiscordService,
    private environment: Environment,
  ) { }

  async substitutePlayer(gameId: string, playerId: string) {
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

    this.discordService.getPlayersChannel().send(substituteRequest({
      gameNumber: game.number,
      gameClass: slot.gameClass,
      team: game.teams.get(slot.teamId),
      gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
    }));

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
    this.logger.verbose(`player ${player.name} taking part in game #${game.number} is marked as 'active'`);

    slot.status = 'active';
    await game.save();
    this.gamesGateway.emitGameUpdated(game);
    this.queueGateway.updateSubstituteRequests();
    return game;
  }

  async replacePlayer(gameId: string, replaceeId: string, replacementId: string) {
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

    let replacementSlot: GamePlayer = game.slots.find(s => s.playerId === replacementId);
    if (replacementSlot) {
      replacementSlot.status = 'active';
    } else {
      // create new slot of the replacement player
      replacementSlot = {
        playerId: replacementId,
        teamId: slot.teamId,
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
      game.gameServer.toString(),
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    this.logger.verbose(`player ${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass} in game #${game.number}`);

    setImmediate(() => this.gameRuntimeService.replacePlayer(game.id, replaceeId, replacementSlot));
    return game;
  }

  private async findPlayerSlot(gameId: string, playerId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    const slot = game.slots.find(s => s.playerId === playerId);
    if (!slot) {
      throw new Error('no such player');
    }

    return { game, slot };
  }

}
