import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { KeyStoreService } from './key-store.service';
import { getModelToken } from 'nestjs-typegoose';
import { generateKeyPairSync } from 'crypto';
import { decode } from 'jsonwebtoken';

class KeyStoreServiceStub {
  public key = generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
  });

  getKey(name: string, purpose: string) {
    switch (name) {
      case 'auth':
      case 'refresh':
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

const refreshTokenModel = {
  create: (object: any) => null,
};

describe('AuthService', () => {
  let service: AuthService;
  let keyStoreService: KeyStoreServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: KeyStoreService, useClass: KeyStoreServiceStub },
        { provide: getModelToken('RefreshToken'), useValue: refreshTokenModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    keyStoreService = module.get(KeyStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#generateJwtToken()', () => {
    describe('auth', () => {
      it('should retrieve the signing auth key from the key store', () => {
        const spy = spyOn(keyStoreService, 'getKey').and.callThrough();
        service.generateJwtToken('auth', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('auth', 'sign');
      });

      it('should encode user id', () => {
        const token = service.generateJwtToken('auth', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });

    describe('refresh', () => {
      it('should retrieve the signing refresh key from the key store', () => {
        const spy = spyOn(keyStoreService, 'getKey').and.callThrough();
        service.generateJwtToken('refresh', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('refresh', 'sign');
      });

      it('should encode user id', () => {
        const token = service.generateJwtToken('refresh', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string; iat: number; exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });

      it('should store the token in the database', () => {
        const spy = spyOn(refreshTokenModel, 'create').and.callThrough();
        const value = service.generateJwtToken('refresh', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith({ value });
      });
    });

    describe('ws', () => {
      it('should retrieve the ws secret from the key store', () => {
        const spy = spyOn(keyStoreService, 'getKey').and.callThrough();
        service.generateJwtToken('ws', 'FAKE_USER_ID');
        expect(spy).toHaveBeenCalledWith('ws', jasmine.any(String));
      });

      it('should encode user id', () => {
        const token = service.generateJwtToken('ws', 'FAKE_USER_ID');
        const decoded = decode(token) as { id: string, iat: number, exp: number };
        expect(decoded.id).toEqual('FAKE_USER_ID');
      });
    });
  });

  describe('#refreshTokens()', () => {
    // todo
  });
});
