import { Inject, Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { PlayersService } from '@/players/services/players.service';
import { KeyPair } from '../types/key-pair';
import { Error, Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { Request } from 'express';
import { AUTH_TOKEN_KEY } from '../tokens/auth-token-key.token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private playersService: PlayersService,
    @Inject(AUTH_TOKEN_KEY) authTokenKey: KeyPair,
  ) {
    super({
      jsonWebTokenOptions: { algorithms: ['ES512'] },
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          let token: string | null = null;
          if (req.cookies) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            token = req.cookies.auth_token;
          }
          return token;
        },
      ]),
      secretOrKey: authTokenKey.publicKey.export({
        format: 'pem',
        type: 'spki',
      }),
    });
  }

  async validate(payload: { id: string }) {
    try {
      return await this.playersService.getById(
        new Types.ObjectId(payload.id) as PlayerId,
      ); // retrieve this via the @User() decorator
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        return null;
      } else {
        throw error;
      }
    }
  }
}
