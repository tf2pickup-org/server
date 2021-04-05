import { Test, TestingModule } from '@nestjs/testing';
import { PlayersGateway } from './players.gateway';

describe('PlayersGateway', () => {
  let gateway: PlayersGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersGateway],
    }).compile();

    gateway = module.get<PlayersGateway>(PlayersGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit playerConnected', async () =>
    new Promise<void>((resolve) => {
      const socket = { id: 'fasldfhasdkjfh' };
      gateway.playerConnected.subscribe((s) => {
        expect(s).toEqual(socket as any);
        resolve();
      });
      gateway.handleConnection(socket as any);
    }));

  it('should emit playerDisconnected', async () =>
    new Promise<void>((resolve) => {
      const socket = { id: 'fklsdafhf984' };
      gateway.playerDisconnected.subscribe((s) => {
        expect(s).toEqual(socket as any);
        resolve();
      });
      gateway.handleDisconnect(socket as any);
    }));
});
