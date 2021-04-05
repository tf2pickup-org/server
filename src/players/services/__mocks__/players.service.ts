import { Subject } from 'rxjs';
import { ReturnModelType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { plainToClass } from 'class-transformer';

@Injectable()
export class PlayersService {
  private lastId = 0;
  playerRegistered = new Subject<string>();

  constructor(
    @InjectModel(Player) private playerModel: ReturnModelType<typeof Player>,
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
