import { Subject } from 'rxjs';
import { ReturnModelType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ObjectId } from 'mongodb';

@Injectable()
export class PlayersService {

  private lastId = 0;
  playerRegistered = new Subject<string>();

  constructor(
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
  ) { }

  getById(id: string) {
    return this.playerModel.findById(id);
  }

  async getAll() {
    return await this.playerModel.find();
  }

  async _reset() {
    await this.playerModel.deleteMany({ });
  }

  async updatePlayer(playerId: ObjectId, update: Partial<Player>) {
    return await this.playerModel.findByIdAndUpdate(playerId, update);
  }

  async findBySteamId(steamId: string) {
    return await this.playerModel.findOne({ steamId });
  }

  async _createOne() {
    const player = {
      name: `fake_player_${++this.lastId}`,
      steamId: `steam_id_${this.lastId}`,
      hasAcceptedRules: true,
      etf2lProfileId: Math.floor(Math.random() * 100),
    };
    return await this.playerModel.create(player);
  }

}
