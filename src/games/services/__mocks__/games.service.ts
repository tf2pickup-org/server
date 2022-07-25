/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Game, GameDocument } from '@/games/models/game';
import { Player } from '@/players/models/player';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Events } from '@/events/events';
import { Mutex } from 'async-mutex';

const orig = jest.requireActual('../games.service');
const OriginalGamesService = orig.GamesService;

@Injectable()
export class GamesService {
  private _original = new OriginalGamesService(
    this.gameModel,
    null,
    null,
    null,
    this.events,
    null,
    new Mutex(),
  );
  private lastGameId = 0;

  constructor(
    @InjectModel('Game') private gameModel: Model<GameDocument>,
    private events: Events,
  ) {}

  async getById(gameId: string) {
    return this._original.getById(gameId);
  }

  async getByNumber(gameNumber: number) {
    return this._original.getByNumber(gameNumber);
  }

  async getByLogSecret(logSecret: string): Promise<Game> {
    return this._original.getByLogSecret(logSecret);
  }

  async update(gameId: string, update: Partial<Game>, adminId?: string) {
    return this._original.update(gameId, update, adminId);
  }

  getOrphanedGames = jest.fn();
  getPlayerGameCount = jest.fn();
  getPlayerPlayedClassCount = jest.fn();

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
