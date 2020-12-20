import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { KeyStoreService } from './key-store.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { generateKeyPairSync } from 'crypto';
import { decode, sign, verify } from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RefreshToken } from '../models/refresh-token';
import { ReturnModelType } from '@typegoose/typegoose';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';

class KeyStoreServiceStub {
  public key = generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
  });

  getKey(name: string, purpose: string) {
    switch (name) {
      case 'auth':
      case 'refresh':
      case 'context':
        switch (purpose) {
          case 'sign': return this.key.privateKey.export({ format: 'pem', type: 'pkcs8' });
          case 'verify': return this.key.publicKey.export({ format: 'pem', type: 'spki' });
          default: throw new Error('invalid purpose');
        }

      case 'ws':
        return 'secret';
    }
  }
}

describe('AuthService', () => {
  const mongod = new MongoMemoryServer();
  let service: AuthService;
  let keyStoreService: KeyStoreServiceStub;
  let refreshTokenModel: ReturnModelType<typeof RefreshToken>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([RefreshToken]),
      ],
      providers: [
        AuthService,
        { provide: KeyStoreService, useClass: KeyStoreServiceStub },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    keyStoreService = module.get(KeyStoreService);
    refreshTokenModel = module.get(getModelToken('RefreshToken'));
  });

  afterEach(async () => await refreshTokenModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#generateJwtToken()', () => {
    describe('auth', () => {
      it('should retrieve the signing auth key from the key store', async () => {
        const spy = jest.spyOn(keyStoreService, 'getKey');
        await service.generateJwtToken('auth', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('auth', 'sign');
      });

      it('should encode user id', async () => {
        const token = await service.generateJwtToken('auth', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });

    describe('refresh', () => {
      it('should retrieve the signing refresh key from the key store', async () => {
        const spy = jest.spyOn(keyStoreService, 'getKey');
        await service.generateJwtToken('refresh', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('refresh', 'sign');
      });

      it('should encode user id', async () => {
        const token = await service.generateJwtToken('refresh', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });

      it('should store the token in the database', async () => {
        const value = await service.generateJwtToken('refresh', 'FAKE_USER_ID');
        const key = await refreshTokenModel.findOne({ value });
        expect(key).toBeDefined();
      });
    });

    describe('ws', () => {
      it('should retrieve the ws secret from the key store', async () => {
        const spy = jest.spyOn(keyStoreService, 'getKey');
        await service.generateJwtToken('ws', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('ws', expect.any(String));
      });

      it('should encode user id', async () => {
        const token = await service.generateJwtToken('ws', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string, iat: number, exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });

    describe('context', () => {
      it('should retrieve the signing key from the key store', async () => {
        const spy = jest.spyOn(keyStoreService, 'getKey');
        await service.generateJwtToken('context', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('context', 'sign');
      });

      it('should encode user id', async () => {
        const token = await service.generateJwtToken('context', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });
  });

  describe('#refreshTokens()', () => {
    it('should throw an error if the refresh token is not in the database', async () => {
      await expect(service.refreshTokens('some fake token')).rejects.toThrowError('invalid token');
    });

    it('should throw an error if the refresh token has expired', async () => {
      const key = keyStoreService.getKey('refresh', 'sign');

      // issue a token that has already expired
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const token = sign({ id: 'FAKE_USER_ID', iat: Math.floor(oneWeekAgo.getDate() / 1000) - 60 }, key, { algorithm: 'ES512', expiresIn: '7d' });
      await refreshTokenModel.create({ value: token });

      await expect(service.refreshTokens(token)).rejects.toThrowError('jwt expired');
    });

    it('should throw an error unless the refresh token matches', async () => {
      const key = generateKeyPairSync('ec', { namedCurve: 'secp521r1' });
      const token = sign({ id: 'FAKE_USER_ID' }, key.privateKey.export({ format: 'pem', type: 'pkcs8' }), { algorithm: 'ES512', expiresIn: '7d' });
      await refreshTokenModel.create({ value: token });

      await expect(service.refreshTokens(token)).rejects.toThrowError('invalid signature');
    });

    it('should generate auth and refresh tokens', async () => {
      const oldRefreshToken = await service.generateJwtToken('refresh', 'FAKE_USER_ID');
      const { refreshToken, authToken } = await service.refreshTokens(oldRefreshToken);

      const key = keyStoreService.getKey('refresh', 'verify');

      const refreshTokenDecoded = verify(refreshToken, key, { algorithms: ['ES512'] }) as { id: string; iat: number; exp: number };
      expect(refreshTokenDecoded.id).toEqual('FAKE_USER_ID');

      const authTokenDecoded = verify(authToken, key, { algorithms: ['ES512'] }) as { id: string, iat: number, exp: number };
      expect(authTokenDecoded.id).toEqual('FAKE_USER_ID');
    });

    it('should remove the old refresh token', async () => {
      const oldRefreshToken = await service.generateJwtToken('refresh', 'FAKE_USER_ID');
      await service.refreshTokens(oldRefreshToken);
      expect(await refreshTokenModel.findOne({ value: oldRefreshToken })).toBeNull();
    });
  });

  describe('#removeOldRefreshTokens()', () => {
    it('should remove old tokens', async () => {
      const key = keyStoreService.getKey('refresh', 'sign');
      const token = sign({ id: 'FAKE_USER_ID' }, key, { algorithm: 'ES512', expiresIn: '7d' });

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 8);
      await refreshTokenModel.create({ value: token, createdAt });

      await service.removeOldRefreshTokens();
      expect(await refreshTokenModel.findOne({ value: token })).toBeNull();
    });
  });
});
