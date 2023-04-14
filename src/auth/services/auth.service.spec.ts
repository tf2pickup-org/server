import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { generateKeyPairSync } from 'crypto';
import { decode } from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { KeyPair } from '../key-pair';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('AuthService', () => {
  let mongod: MongoMemoryServer;
  let service: AuthService;
  let authKeys: KeyPair;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'AUTH_TOKEN_KEY',
          useFactory: () =>
            generateKeyPairSync('ec', { namedCurve: 'secp521r1' }),
        },
        { provide: 'WEBSOCKET_SECRET', useValue: 'websocket_secret' },
        {
          provide: 'CONTEXT_TOKEN_KEY',
          useFactory: () =>
            generateKeyPairSync('ec', { namedCurve: 'secp521r1' }),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authKeys = module.get('AUTH_TOKEN_KEY');
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await connection.close();
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
