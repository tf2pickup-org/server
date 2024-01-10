import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { assertIsError } from '@/utils/assert-is-error';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlayerActionEntry,
  PlayerActionEntryDocument,
} from '../models/player-action-entry';
import { PlayerAction } from '../player-actions/player-action';
import { PlayerConnectedToGameserver } from '../player-actions/player-connected-to-gameserver';
import { PlayerOnlineStatusChanged } from '../player-actions/player-online-status-changed';
import { PlayerSaidInMatchChat } from '../player-actions/player-said-in-match-chat';

@Injectable()
export class PlayerActionLoggerService implements OnModuleInit {
  private readonly logger = new Logger(PlayerActionLoggerService.name);

  constructor(
    @InjectModel(PlayerActionEntry.name)
    private readonly playerActionEntryModel: Model<PlayerActionEntryDocument>,
    private events: Events,
    private playersService: PlayersService,
    private gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.playerJoinedGameServer.subscribe(
      async ({ gameId, steamId, ipAddress }) => {
        try {
          const [player, game] = await Promise.all([
            this.playersService.findBySteamId(steamId),
            this.gamesService.getById(gameId),
          ]);
          await this.logAction(
            new PlayerConnectedToGameserver(player, { ipAddress }, game),
          );
        } catch (error) {
          assertIsError(error);
          this.logger.error(error.message);
        }
      },
    );
    this.events.playerConnects.subscribe(async ({ playerId, metadata }) => {
      try {
        const player = await this.playersService.getById(playerId);
        await this.logAction(
          new PlayerOnlineStatusChanged(player, metadata, true),
        );
      } catch (error) {
        assertIsError(error);
        this.logger.error(error.message);
      }
    });
    this.events.playerSaidInGameChat.subscribe(async ({ steamId, message }) => {
      try {
        const player = await this.playersService.findBySteamId(steamId);
        await this.logAction(new PlayerSaidInMatchChat(player, {}, message));
      } catch (error) {
        assertIsError(error);
        this.logger.error(error.message);
      }
    });
  }

  async logAction(action: PlayerAction) {
    await this.playerActionEntryModel.create({
      player: action.player._id,
      ipAddress: action.metadata.ipAddress,
      userAgent: action.metadata.userAgent,
      action: action.toString(),
    });
  }
}
