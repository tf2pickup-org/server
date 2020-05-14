import { Subject } from 'rxjs';
import { ObjectId } from 'mongodb';

export class PlayersService {

  _players = new Map<string, any>();

  playerRegistered = new Subject<string>();

  getById(id: string) {
    return Promise.resolve(this._players.get(id));
  }

  getAll() {
    return Promise.resolve(Array.from(this._players.values()));
  }

  _createOne() {
    const id = new ObjectId();
    const player = {
      id,
      name: `player_${id}`,
      steamId: `${Math.floor(Math.random() * 100)}`,
      hasAcceptedRules: false,
      etf2lProfileId: Math.floor(Math.random() * 100),
    };
    this._players.set(player.id.toString(), player);
    return player;
  }

}
