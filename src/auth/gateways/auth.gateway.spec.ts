import { Test, TestingModule } from '@nestjs/testing';
import { AuthGateway } from './auth.gateway';
import { KeyStoreService } from '../services/key-store.service';
import { PlayersService } from '@/players/services/players.service';

class KeyStoreServiceStub {
  getKey(name: string, purpose: string) { return 'secret'; }
}

class PlayersServiceStub {

}

describe('AuthGateway', () => {
  let gateway: AuthGateway;
  let keyStoreService: KeyStoreServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGateway,
        { provide: KeyStoreService, useClass: KeyStoreServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    gateway = module.get<AuthGateway>(AuthGateway);
    keyStoreService = module.get(KeyStoreService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    beforeEach(() => gateway.server = { use: (middleware: any) => null } as any);

    it('should register middleware', () => {
      const spy = spyOn(gateway.server, 'use').and.callThrough();
      const spy2 = spyOn(keyStoreService, 'getKey').and.callThrough();
      gateway.onModuleInit();
      expect(spy).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalledWith('ws', 'verify');
    });
  });
});
