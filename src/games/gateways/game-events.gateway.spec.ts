import { Test, TestingModule } from '@nestjs/testing';
import { GameEventsGateway } from './game-events.gateway';
import { Events } from '@/events/events';
import { Socket } from 'socket.io';
import { GameState } from '../models/game-state';
import { Game } from '../models/game';
import { GameEventType } from '../models/game-event-type';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { waitABit } from '@/utils/wait-a-bit';
import { WebsocketEvent } from '@/websocket-event';

describe('GameEventsGateway', () => {
  let gateway: GameEventsGateway;
  let events: Events;
  let socket: jest.Mocked<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameEventsGateway, Events],
    }).compile();

    gateway = module.get<GameEventsGateway>(GameEventsGateway);
    events = module.get(Events);
  });

  beforeEach(() => {
    socket = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    gateway.onModuleInit();
    gateway.afterInit(socket);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('when game events change', () => {
    beforeEach(async () => {
      const slotId = new Types.ObjectId();
      const player1 = new Types.ObjectId() as PlayerId;

      const oldGame = {
        number: 1,
        state: GameState.launching,
        events: [
          {
            event: GameEventType.gameCreated,
            at: new Date(),
          },
        ],
      } as Game;

      const newGame = {
        number: 1,
        state: GameState.launching,
        events: [
          {
            event: GameEventType.gameCreated,
            at: new Date(),
          },
          {
            event: GameEventType.gameEnded,
            at: new Date(),
          },
        ],
      } as Game;

      events.gameChanges.next({ oldGame, newGame });
      await waitABit(100);
    });

    it('should emit', () => {
      expect(socket.to).toHaveBeenCalledWith('/games/1/events');
      expect(socket.emit).toHaveBeenCalledWith(
        WebsocketEvent.gameEventsUpdated,
        expect.any(Object),
      );
    });
  });
});
