import { Test, TestingModule } from '@nestjs/testing';
import { GameSlotsGateway } from './game-slots.gateway';
import { Events } from '@/events/events';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { Tf2Team } from '../models/tf2-team';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { SlotStatus } from '../models/slot-status';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { Game } from '../models/game';
import { Socket } from 'socket.io';
import { WebsocketEvent } from '@/websocket-event';
import { waitABit } from '@/utils/wait-a-bit';
import { GameState } from '../models/game-state';

describe('GameSlotsGateway', () => {
  let gateway: GameSlotsGateway;
  let events: Events;
  let socket: jest.Mocked<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSlotsGateway, Events],
    }).compile();

    gateway = module.get<GameSlotsGateway>(GameSlotsGateway);
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

  describe('when game slots change', () => {
    beforeEach(async () => {
      const slotId = new Types.ObjectId();
      const player1 = new Types.ObjectId() as PlayerId;

      const oldGame = {
        number: 1,
        state: GameState.launching,
        slots: [
          {
            _id: slotId,
            player: player1,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.offline,
          },
        ],
      } as Game;

      const newGame = {
        number: 1,
        state: GameState.launching,
        slots: [
          {
            _id: slotId,
            player: player1,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.connected,
          },
        ],
      } as Game;

      events.gameChanges.next({ oldGame, newGame });
      await waitABit(100);
    });

    it('should emit', () => {
      expect(socket.to).toHaveBeenCalledWith('/games/1/slots');
      expect(socket.emit).toHaveBeenCalledWith(
        WebsocketEvent.gameSlotsUpdated,
        expect.any(Object),
      );
    });
  });

  describe("when game slots don't change", () => {
    beforeEach(async () => {
      const slotId = new Types.ObjectId();
      const player1 = new Types.ObjectId() as PlayerId;

      const oldGame = {
        number: 1,
        state: GameState.launching,
        slots: [
          {
            _id: slotId,
            player: player1,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.offline,
          },
        ],
      } as Game;

      const newGame = {
        number: 1,
        state: GameState.started,
        slots: [
          {
            _id: slotId,
            player: player1,
            team: Tf2Team.blu,
            gameClass: Tf2ClassName.scout,
            status: SlotStatus.active,
            connectionStatus: PlayerConnectionStatus.offline,
          },
        ],
      } as Game;

      events.gameChanges.next({ oldGame, newGame });
      await waitABit(100);
    });

    it('should not emit', () => {
      expect(socket.to).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });
});
