/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Game } from '@/games/models/game';
import { Player } from '@/players/models/player';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { Events } from '@/events/events';
import { Mutex } from 'async-mutex';
import { Tf2Team } from '@/games/models/tf2-team';
import { GameId } from '@/games/types/game-id';

const orig = jest.requireActual('../games.service');
const OriginalGamesService = orig.GamesService;

@Injectable()
export class GamesService {
  private _original = new OriginalGamesService(
    this.gameModel,
    null,
    this.events,
    null,
    new Mutex(),
  );
  private lastGameId = 0;

  constructor(
    @InjectModel('Game') private gameModel: Model<Game>,
    private events: Events,
  ) {}

  async getById(gameId: GameId): Promise<Game> {
    return this._original.getById(gameId);
  }

  async getByNumber(gameNumber: number) {
    return this._original.getByNumber(gameNumber);
  }

  async getByLogSecret(logSecret: string): Promise<Game> {
    return this._original.getByLogSecret(logSecret);
  }

  async update(gameId: GameId, update: UpdateQuery<Game>, adminId?: string) {
    return this._original.update(gameId, update, adminId);
  }

  getRunningGames = jest
    .fn()
    .mockImplementation(() => this._original.getRunningGames());

  getGameCount = jest
    .fn()
    .mockImplementation(
      async (filter) => await this._original.getGameCount(filter),
    );
  getOrphanedGames = jest.fn();
  getPlayerPlayedClassCount = jest.fn();
  calculatePlayerJoinGameServerTimeout = jest.fn();
  forceEnd = jest.fn();

  async _createOne(players?: Player[]) {
    let lastTeamId = 0;
    const teams = [Tf2Team.red, Tf2Team.blu];
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
