import { Injectable } from '@nestjs/common';
import steam = require('passport-steam');
import { PlayersService } from 'src/players/players.service';
import { ConfigService } from 'src/config/config.service';
import { SteamProfile } from 'src/players/models/steam-profile';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class SteamStrategy extends PassportStrategy(steam.Strategy) {

  constructor(
    configService: ConfigService,
    private playerService: PlayersService,
  ) {
    super({
      returnURL: `${configService.apiUrl}/auth/steam/return`,
      realm: configService.apiUrl,
      apiKey: configService.steamApiKey,
    });

    // go to AuthController for the steam return route
  }

  async validate(identifier: any, profile: SteamProfile) {
    const player = await this.playerService.findBySteamId(profile.id);
    if (player) {
      player.avatarUrl = profile.photos[0].value;
      await player.save();
      return player.toJSON();
    } else {
      const newPlayer = await this.playerService.createPlayer(profile);
      return newPlayer.toJSON();
    }
  }

}
