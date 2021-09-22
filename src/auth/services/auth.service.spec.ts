import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { generateKeyPairSync } from 'crypto';
import { decode, sign, verify } from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  RefreshToken,
  RefreshTokenDocument,
  refreshTokenSchema,
} from '../models/refresh-token';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { InvalidTokenError } from '../errors/invalid-token.error';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { KeyPair } from '../key-pair';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { ApiKey, apiKeySchema } from '../models/api-key';

describe('AuthService', () => {
  let mongod: MongoMemoryServer;
  let service: AuthService;
  let refreshTokenModel: Model<RefreshTokenDocument>;
  let authKeys: KeyPair;
  let refreshKeys: KeyPair;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: RefreshToken.name, schema: refreshTokenSchema },
          { name: ApiKey.name, schema: apiKeySchema },
        ]),
      ],
      providers: [
        AuthService,
        {
          provide: 'AUTH_TOKEN_KEY',
          useFactory: () =>
            generateKeyPairSync('ec', { namedCurve: 'secp521r1' }),
        },
        {
          provide: 'REFRESH_TOKEN_KEY',
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
    refreshTokenModel = module.get(getModelToken(RefreshToken.name));
    authKeys = module.get('AUTH_TOKEN_KEY');
    refreshKeys = module.get('REFRESH_TOKEN_KEY');
    connection = module.get(getConnectionToken());

    await service.onModuleInit();
  });

  afterEach(async () => {
    await refreshTokenModel.deleteMany({});
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

    describe('refresh', () => {
      it('should encode user id', async () => {
        const token = await service.generateJwtToken(
          JwtTokenPurpose.refresh,
          'FAKE_USER_ID',
        );
        const decoded = decode(token) as {
          id: string;
          iat: number;
          exp: number;
        };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });

      it('should store the token in the database', async () => {
        const value = await service.generateJwtToken(
          JwtTokenPurpose.refresh,
          'FAKE_USER_ID',
        );
        const key = await refreshTokenModel.findOne({ value });
        expect(key).toBeDefined();
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

  describe('#refreshTokens()', () => {
    it('should throw an error if the refresh token is not in the database', async () => {
      await expect(service.refreshTokens('some fake token')).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should throw an error if the refresh token has expired', async () => {
      const key = refreshKeys.privateKey.export({
        format: 'pem',
        type: 'pkcs8',
      });

      // issue a token that has already expired
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const token = sign(
        {
          id: 'FAKE_USER_ID',
          iat: Math.floor(oneWeekAgo.getDate() / 1000) - 60,
        },
        key,
        { algorithm: 'ES512', expiresIn: '7d' },
      );
      await refreshTokenModel.create({ value: token });

      await expect(service.refreshTokens(token)).rejects.toThrowError(
        'jwt expired',
      );
    });

    it('should throw an error unless the refresh token matches', async () => {
      const key = generateKeyPairSync('ec', { namedCurve: 'secp521r1' });
      const token = sign(
        { id: 'FAKE_USER_ID' },
        key.privateKey.export({ format: 'pem', type: 'pkcs8' }),
        { algorithm: 'ES512', expiresIn: '7d' },
      );
      await refreshTokenModel.create({ value: token });

      await expect(service.refreshTokens(token)).rejects.toThrowError(
        'invalid signature',
      );
    });

    it('should generate auth and refresh tokens', async () => {
      const oldRefreshToken = await service.generateJwtToken(
        JwtTokenPurpose.refresh,
        'FAKE_USER_ID',
      );
      const { refreshToken, authToken } = await service.refreshTokens(
        oldRefreshToken,
      );

      const refreshPublicKey = refreshKeys.publicKey.export({
        format: 'pem',
        type: 'spki',
      });

      const refreshTokenDecoded = verify(refreshToken, refreshPublicKey, {
        algorithms: ['ES512'],
      }) as { id: string; iat: number; exp: number };
      expect(refreshTokenDecoded.id).toEqual('FAKE_USER_ID');

      const authPublicKey = authKeys.publicKey.export({
        format: 'pem',
        type: 'spki',
      });
      const authTokenDecoded = verify(authToken, authPublicKey, {
        algorithms: ['ES512'],
      }) as { id: string; iat: number; exp: number };
      expect(authTokenDecoded.id).toEqual('FAKE_USER_ID');
    });

    it('should remove the old refresh token', async () => {
      const oldRefreshToken = await service.generateJwtToken(
        JwtTokenPurpose.refresh,
        'FAKE_USER_ID',
      );
      await service.refreshTokens(oldRefreshToken);
      expect(
        await refreshTokenModel.findOne({ value: oldRefreshToken }),
      ).toBeNull();
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

  describe('#getApiKey()', () => {
    it('should return an api key', async () => {
      expect(await service.getApiKey()).toBeTruthy();
    });
  });

  describe('#generateApiKey()', () => {
    it('should regenerate api key', async () => {
      const oldApiKey = await service.getApiKey();
      const newApiKey = await service.generateApiKey();
      expect(oldApiKey).not.toEqual(newApiKey);
      expect(await service.getApiKey()).toEqual(newApiKey);
    });
  });

  describe('#removeOldRefreshTokens()', () => {
    it('should remove old tokens', async () => {
      const key = refreshKeys.privateKey.export({
        format: 'pem',
        type: 'pkcs8',
      });
      const token = sign({ id: 'FAKE_USER_ID' }, key, {
        algorithm: 'ES512',
        expiresIn: '7d',
      });

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 8);
      await refreshTokenModel.create({ value: token, createdAt });

      await service.removeOldRefreshTokens();
      expect(await refreshTokenModel.findOne({ value: token })).toBeNull();
    });
  });
});
