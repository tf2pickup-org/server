import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { generateKeyPairSync } from 'crypto';
import { decode } from 'jsonwebtoken';
import { JwtTokenPurpose } from '../types/jwt-token-purpose';
import { KeyPair } from '../types/key-pair';
import { AUTH_TOKEN_KEY } from '../tokens/auth-token-key.token';
import { WEBSOCKET_SECRET } from '../tokens/websocket-secret.token';
import { CONTEXT_TOKEN_KEY } from '../tokens/context-token-key.token';

describe('AuthService', () => {
  let service: AuthService;
  let authKeys: KeyPair;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AUTH_TOKEN_KEY,
          useFactory: () =>
            generateKeyPairSync('ec', { namedCurve: 'secp521r1' }),
        },
        { provide: WEBSOCKET_SECRET, useValue: 'websocket_secret' },
        {
          provide: CONTEXT_TOKEN_KEY,
          useFactory: () =>
            generateKeyPairSync('ec', { namedCurve: 'secp521r1' }),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authKeys = module.get(AUTH_TOKEN_KEY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#generateJwtToken()', () => {
    describe('auth', () => {
      it('should encode user id', async () => {
        const token = await service.generateJwtToken(
          JwtTokenPurpose.auth,
          'FAKE_USER_ID',
        );
        const decoded = decode(token) as {
          id: string;
          iat: number;
          exp: number;
        };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });

    describe('ws', () => {
      it('should encode user id', async () => {
        const token = await service.generateJwtToken(
          JwtTokenPurpose.websocket,
          'FAKE_USER_ID',
        );
        const decoded = decode(token) as {
          id: string;
          iat: number;
          exp: number;
        };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });

    describe('context', () => {
      it('should encode user id', async () => {
        const token = await service.generateJwtToken(
          JwtTokenPurpose.context,
          'FAKE_USER_ID',
        );
        const decoded = decode(token) as {
          id: string;
          iat: number;
          exp: number;
        };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });
  });

  describe('#verifyToken()', () => {
    it('should verify auth token', async () => {
      const token = await service.generateJwtToken(
        JwtTokenPurpose.auth,
        'FAKE_USER_ID',
      );
      expect(service.verifyToken(JwtTokenPurpose.auth, token).id).toEqual(
        'FAKE_USER_ID',
      );
    });

    it('should verify context token', async () => {
      const token = await service.generateJwtToken(
        JwtTokenPurpose.context,
        'FAKE_USER_ID',
      );
      expect(service.verifyToken(JwtTokenPurpose.context, token).id).toEqual(
        'FAKE_USER_ID',
      );
    });
  });
});
