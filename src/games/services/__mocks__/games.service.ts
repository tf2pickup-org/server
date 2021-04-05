/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { Game } from '@/games/models/game';
import { ReturnModelType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';
import { ObjectId } from 'mongodb';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

@Injectable()
export class GamesService {
  private lastGameId = 0;

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
  ) {}

  async getById(gameId: string) {
    return await this.gameModel.findById(gameId);
  }

  async update(gameId: string, update: Partial<Game>) {
    return await this.gameModel.findByIdAndUpdate(gameId, update, {
      new: true,
    });
  }

  async getPlayerActiveGame(playerId: string) {
    return Promise.resolve(null);
  }

  async _createOne(players?: Player[]) {
    let lastTeamId = 0;
    const teams = ['red', 'blu'];
    return await this.gameModel.create({
      number: ++this.lastGameId,
      map: 'cp_badlands',
      slots: players?.map((p) => ({
        player: p._id,
        team: teams[`${lastTeamId++ % 2}`],
        gameClass: Tf2ClassName.soldier,
      })),
    });
  }

  async _reset() {
    await this.gameModel.deleteMany({});
  }
}
