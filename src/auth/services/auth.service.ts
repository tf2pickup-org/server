import { Inject, Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { KeyPair } from '../key-pair';
import { AUTH_TOKEN_KEY } from '../tokens/auth-token-key.token';
import { WEBSOCKET_SECRET } from '../tokens/websocket-secret.token';
import { CONTEXT_TOKEN_KEY } from '../tokens/context-token-key.token';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_TOKEN_KEY) private readonly authTokenKey: KeyPair,
    @Inject(WEBSOCKET_SECRET) private readonly websocketSecret: string,
    @Inject(CONTEXT_TOKEN_KEY) private readonly contextTokenKey: KeyPair,
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
