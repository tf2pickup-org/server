import { Test, TestingModule } from '@nestjs/testing';
import { TwitchGateway } from './twitch.gateway';

class SocketStub {
  emit(ev: string, ...args:  any[]) { return null; }
}

describe('TwitchGateway', () => {
  let gateway: TwitchGateway;
  let socket: SocketStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwitchGateway],
    }).compile();

    gateway = module.get<TwitchGateway>(TwitchGateway);
  });

  beforeEach(() => {
    socket = new SocketStub();
    gateway.afterInit(socket as any);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#emitStreamsUpdate()', () => {
    it('should emit the event through the socket', () => {
      const spy = jest.spyOn(socket, 'emit');
      gateway.emitStreamsUpdate([]);
      expect(spy).toHaveBeenCalledWith('twitch streams update', []);
    });
  });
});
