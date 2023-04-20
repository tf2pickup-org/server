import { Inject, Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { KeyPair } from '../key-pair';

@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTH_TOKEN_KEY') private authTokenKey: KeyPair,
    @Inject('WEBSOCKET_SECRET') private websocketSecret: string,
    @Inject('CONTEXT_TOKEN_KEY') private contextTokenKey: KeyPair,
  ) {}

  generateJwtToken(purpose: JwtTokenPurpose, userId: string): string {
    switch (purpose) {
      case JwtTokenPurpose.auth: {
        const key = this.authTokenKey.privateKey.export({
          format: 'pem',
          type: 'pkcs8',
        });
        return sign({ id: userId }, key, {
          algorithm: 'ES512',
          expiresIn: '7d',
        });
      }

      case JwtTokenPurpose.websocket: {
        const key = this.websocketSecret;
        return sign({ id: userId }, key, {
          algorithm: 'HS256',
          expiresIn: '10m',
        });
      }

      case JwtTokenPurpose.context: {
        const key = this.contextTokenKey.privateKey.export({
          format: 'pem',
          type: 'pkcs8',
        });
        return sign({ id: userId }, key, {
          algorithm: 'ES512',
          expiresIn: '1m',
        });
      }

      default:
        throw new Error('unknown key purpose');
    }
  }

  verifyToken(
    purpose: JwtTokenPurpose.auth | JwtTokenPurpose.context,
    token: string,
  ): { id: string; iat: number; exp: number } {
    let key: string | Buffer;

    switch (purpose) {
      case JwtTokenPurpose.auth:
        key = this.authTokenKey.publicKey.export({
          format: 'pem',
          type: 'spki',
        });
        break;

      case JwtTokenPurpose.context:
        key = this.contextTokenKey.publicKey.export({
          format: 'pem',
          type: 'spki',
        });
        break;

      // no default
    }

    return verify(token, key, { algorithms: ['ES512'] }) as {
      id: string;
      iat: number;
      exp: number;
    };
  }
}
