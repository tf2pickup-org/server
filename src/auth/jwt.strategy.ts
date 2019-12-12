import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { PlayersService } from 'src/players/players.service';
import { KeyStoreService } from './key-store.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    private playersService: PlayersService,
    keyStoreService: KeyStoreService,
  ) {
    super({
      jsonWebTokenOptions: { algorithms: ['ES512'] },
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: keyStoreService.getKey('auth', 'verify'),
    });
  }

  async validate(payload: { id: string }) {
    const player = await this.playersService.getById(payload.id);
    return player.toJSON(); // retrieve this via the @User() decorator
  }

}
