import { Injectable } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { Game } from '@/games/models/game';
import { ReturnModelType } from '@typegoose/typegoose';
import { Player } from '@/players/models/player';

@Injectable()
export class GamesService {

  private lastGameId = 0;

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
  ) { }

  async getById(gameId: string) {
    return await this.gameModel.findById(gameId);
  }

  async update(gameId: string, update: Partial<Game>) {
    return await this.gameModel.findByIdAndUpdate(gameId, update, { new: true });
  }

  async getPlayerActiveGame(playerId: string) { return Promise.resolve(null); }

  async _createOne(players: Player[]) {
    let lastTeamId = 0;
    return await this.gameModel.create({
      number: ++this.lastGameId,
      map: 'cp_badlands',
      teams: {
        0: 'RED',
        1: 'BLU',
      },
      slots: players.map(p => ({
        playerId: p.id,
        teamId: `${(lastTeamId++) % 2}`,
        gameClass: 'soldier',
      })),
      players,
      state: 'launching',
    });
  }

  async _reset() {
    await this.gameModel.deleteMany({ });
  }

}
