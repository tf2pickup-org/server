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

  getById(id: string) {
    return this.playerModel.findById(id);
  }

  getAll() {
    return this.playerModel.find().exec();
  }

  async _reset() {
    await this.playerModel.deleteMany({ }).exec();
  }

  async _createOne() {
    const player = {
      name: `fake_player_${++this.lastId}`,
      steamId: `${Math.floor(Math.random() * 100)}`,
      hasAcceptedRules: false,
      etf2lProfileId: Math.floor(Math.random() * 100),
    };
    return await this.playerModel.create(player);
  }

}
