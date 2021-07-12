import { Subject } from 'rxjs';
import { Player, PlayerDocument } from '@/players/models/player';
import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Model, UpdateQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PlayersService {
  private lastId = 0;
  playerRegistered = new Subject<string>();

  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
  ) {}

  async getById(id: string) {
    return plainToClass(
      Player,
      await this.playerModel.findById(id).orFail().lean().exec(),
    );
  }

  async getAll() {
    return plainToClass(Player, await this.playerModel.find().lean().exec());
  }

  async findBySteamId(steamId: string) {
    return plainToClass(
      Player,
      await this.playerModel.findOne({ steamId }).orFail().lean().exec(),
    );
  }

  async _reset() {
    await this.playerModel.deleteMany({}).exec();
  }

  async updatePlayer(playerId: string, update: UpdateQuery<Player>) {
    const newPlayer = plainToClass(
      Player,
      await this.playerModel
        .findOneAndUpdate({ _id: playerId }, update, { new: true })
        .lean()
        .exec(),
    );
    return newPlayer;
  }

  async _createOne(overrides: Partial<Player> = {}) {
    const player = {
      name: `fake_player_${++this.lastId}`,
      steamId: `steamid_${this.lastId}`,
      hasAcceptedRules: false,
      etf2lProfileId: this.lastId,
      ...overrides,
    };
    return await this.playerModel.create(player);
  }
}
