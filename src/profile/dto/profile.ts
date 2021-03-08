import { PreferencesType } from '@/player-preferences/services/player-preferences.service';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { Type } from 'class-transformer';

interface ProfileParams {
  player: Player;
  activeGameId: string;
  bans: PlayerBan[];
  mapVote: string;
  preferences: PreferencesType;
}

export class Profile {

  constructor(params: ProfileParams) {
    this.player = params.player;
    this.activeGameId = params.activeGameId;
    this.bans = params.bans;
    this.mapVote = params.mapVote;
    this.preferences = params.preferences;
  }

  @Type(() => Player)
  player: Player;

  activeGameId: string;

  @Type(() => PlayerBan)
  bans: PlayerBan[];

  mapVote: string;

  @Type(() => String)
  preferences: PreferencesType;

}
