import { Test, TestingModule } from '@nestjs/testing';
import { AuthGateway } from './auth.gateway';
import { PlayersService } from '@/players/services/players.service';

class PlayersServiceStub {}

describe('AuthGateway', () => {
  let gateway: AuthGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGateway,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: 'WEBSOCKET_SECRET', useValue: 'secret' },
      ],
    }).compile();

    gateway = module.get<AuthGateway>(AuthGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    beforeEach(
      () => (gateway.server = { use: jest.fn().mockReturnValue(null) } as any),
    );

    it('should register middleware', () => {
      gateway.onModuleInit();
      expect(gateway.server.use).toHaveBeenCalled();
    });
  });
});
