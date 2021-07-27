import { Inject, Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { PlayersService } from '@/players/services/players.service';
import { KeyPair } from '../key-pair';
import { Error } from 'mongoose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private playersService: PlayersService,
    @Inject('AUTH_TOKEN_KEY') authTokenKey: KeyPair,
  ) {
    super({
      jsonWebTokenOptions: { algorithms: ['ES512'] },
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: authTokenKey.publicKey.export({
        format: 'pem',
        type: 'spki',
      }),
    });
  }

  async validate(payload: { id: string }) {
    try {
      return await this.playersService.getById(payload.id); // retrieve this via the @User() decorator
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        return null;
      } else {
        throw error;
      }
    }
  }
}
