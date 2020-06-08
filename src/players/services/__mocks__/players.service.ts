import { Subject } from 'rxjs';
import { ReturnModelType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';

@Injectable()
export class PlayersService {

  private lastId = 0;
  playerRegistered = new Subject<string>();

  constructor(
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
  ) { }

  async getById(id: string) {
    return await this.playerModel.findById(id);
  }

  async getAll() {
    return await this.playerModel.find();
  }

  async findBySteamId(steamId: string) {
    return await this.playerModel.findOne({ steamId });
  }

  async _reset() {
    await this.playerModel.deleteMany({ }).exec();
  }

  async _createOne() {
    const player = {
      name: `fake_player_${++this.lastId}`,
      steamId: `steamid_${this.lastId}`,
      hasAcceptedRules: false,
      etf2lProfileId: this.lastId,
    };
    return await this.playerModel.create(player);
  }

}
