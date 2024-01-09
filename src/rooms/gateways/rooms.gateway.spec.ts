import { Test, TestingModule } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { Socket } from 'socket.io';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let socket: jest.Mocked<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsGateway],
    }).compile();

    gateway = module.get<RoomsGateway>(RoomsGateway);
  });

  beforeEach(() => {
    socket = {
      rooms: new Set(),
      join: jest.fn().mockImplementation((room) => socket.rooms.add(room)),
      leave: jest.fn().mockImplementation((room) => socket.rooms.delete(room)),
    } as unknown as jest.Mocked<Socket>;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#join()', () => {
    it('should join', () => {
      const ret = gateway.join(socket, 'FAKE_ROOM');
      expect(ret).toEqual(['FAKE_ROOM']);
    });
  });

  describe('#leave()', () => {
    beforeEach(() => {
      socket.rooms.add('FAKE_ROOM');
    });

    it('should leave', () => {
      const ret = gateway.leave(socket, 'FAKE_ROOM');
      expect(ret).toEqual([]);
    });
  });
});
