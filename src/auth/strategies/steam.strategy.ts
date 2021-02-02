import { Injectable } from '@nestjs/common';
import steam = require('passport-steam');
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';
import { SteamProfile } from 'src/players/models/steam-profile';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class SteamStrategy extends PassportStrategy(steam.Strategy) {

  constructor(
    environment: Environment,
    private playerService: PlayersService,
  ) {
    super({
      returnURL: `${environment.apiUrl}/auth/steam/return`,
      realm: environment.apiUrl,
      apiKey: environment.steamApiKey,
    });

    // go to AuthController for the steam return route
  }

  async validate(identifier: any, profile: SteamProfile) {
    const player = await this.playerService.findBySteamId(profile.id);
    if (player) {
      return await this.playerService.updatePlayer(player._id, {
        avatar: {
          small: profile.photos[0]?.value,
          medium: profile.photos[1]?.value,
          large: profile.photos[2]?.value,
        },
        avatarUrl: profile.photos[0]?.value,
      });
    } else {
      return await this.playerService.createPlayer(profile);
    }
  }

}
