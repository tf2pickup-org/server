import { Injectable } from '@nestjs/common';
import { use } from 'passport';
import steam = require('passport-steam');
import { PlayersService } from 'src/players/players.service';
import { ConfigService } from 'src/config/config.service';
import { Player } from 'src/players/models/player';
import { SteamProfile } from 'src/players/models/steam-profile';

@Injectable()
export class SteamStrategy {

  constructor(
    private configService: ConfigService,
    private playerService: PlayersService,
  ) {
    this.init();
  }

  private init() {
    use(new steam.Strategy({
      returnURL: `${this.configService.apiUrl}/auth/steam/return`,
      realm: this.configService.apiUrl,
      apiKey: this.configService.steamApiKey,
    }, async (identifier: any, profile: SteamProfile, done: (error: any, player: Player) => void) => {
      const player = await this.playerService.findBySteamId(profile.id);
      if (player) {
        player.avatarUrl = profile.photos[0].value;
        await player.save();
        return done(null, player);
      } else {
        try {
          const newPlayer = await this.playerService.createPlayer(profile);
          return done(null, newPlayer);
        } catch (error) {
          return done(error, null);
        }
      }
    }));
  }

}
