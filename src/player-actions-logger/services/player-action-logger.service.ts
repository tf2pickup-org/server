import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlayerActionEntry,
  PlayerActionEntryDocument,
} from '../models/player-action-entry';
import { PlayerAction } from '../player-actions/player-action';

@Injectable()
export class PlayerActionLoggerService {
  constructor(
    @InjectModel(PlayerActionEntry.name)
    private readonly playerActionEntryModel: Model<PlayerActionEntryDocument>,
  ) {}

  async logAction(action: PlayerAction) {
    await this.playerActionEntryModel.create({
      player: action.player._id,
      ipAddress: action.metadata.ipAddress,
      userAgent: action.metadata.userAgent,
      action: action.toString(),
    });
  }
}
