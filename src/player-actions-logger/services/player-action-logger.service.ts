import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlayerActionEntry,
  PlayerActionEntryDocument,
} from '../models/player-action-entry';
import { PlayerAction } from '../player-actions/player-action';
import { PlayerConnectedToGameserver } from '../player-actions/player-connected-to-gameserver';

@Injectable()
export class PlayerActionLoggerService implements OnModuleInit {
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
        const [player, game] = await Promise.all([
          this.playersService.findBySteamId(steamId),
          this.gamesService.getById(gameId),
        ]);
        this.logAction(
          new PlayerConnectedToGameserver(player, { ipAddress }, game),
        );
      },
    );
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
