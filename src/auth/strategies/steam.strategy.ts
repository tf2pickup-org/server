import { Injectable } from '@nestjs/common';
import steam = require('passport-steam');
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';
import { SteamProfile } from '@/players/steam-profile';
import { PassportStrategy } from '@nestjs/passport';
import { Error } from 'mongoose';

@Injectable()
export class SteamStrategy extends PassportStrategy(steam.Strategy) {
  constructor(environment: Environment, private playerService: PlayersService) {
    super({
      returnURL: `${environment.apiUrl}/auth/steam/return`,
      realm: environment.apiUrl,
      apiKey: environment.steamApiKey,
    });

    // go to AuthController for the steam return route
  }

  async validate(identifier: any, profile: SteamProfile) {
    try {
      const player = await this.playerService.findBySteamId(profile.id);
      return await this.playerService.updatePlayer(player.id, {
        avatar: {
          small: profile.photos[0]?.value,
          medium: profile.photos[1]?.value,
          large: profile.photos[2]?.value,
        },
      });
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        return await this.playerService.createPlayer(profile);
      } else {
        throw error;
      }
    }
  }
}
