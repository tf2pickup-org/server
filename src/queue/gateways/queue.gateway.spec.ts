import { Test, TestingModule } from '@nestjs/testing';
import { QueueGateway } from './queue.gateway';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Events } from '@/events/events';
import { Socket } from 'socket.io';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { QueueSlotWrapper } from '../controllers/queue-slot-wrapper';
import { QueueState } from '../types/queue-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { PlayersService } from '@/players/services/players.service';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

jest.mock('../services/queue.service');
jest.mock('socket.io');
jest.mock('../services/map-vote.service');
jest.mock('../services/queue-announcements.service');
jest.mock('../services/friends.service');
jest.mock('../controllers/queue-slot-wrapper');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/players/services/players.service', () => ({
  PlayersService: jest.fn().mockImplementation(() => ({})),
}));

const mockSubstituteRequests = [
  {
    gameId: 'FAKE_GAME_ID',
    gameNumber: 5,
    gameClass: Tf2ClassName.scout,
    team: 'BLU',
  },
];

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let queueService: jest.Mocked<QueueService>;
  let mapVoteService: jest.Mocked<MapVoteService>;
  let socket: Socket;
  let queueAnnouncementsService: jest.Mocked<QueueAnnouncementsService>;
  let friendsService: jest.Mocked<FriendsService>;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueGateway,
        Events,
        QueueService,
        MapVoteService,
        QueueAnnouncementsService,
        FriendsService,
        ConfigurationService,
        PlayerBansService,
        PlayersService,
      ],
    }).compile();

    gateway = module.get<QueueGateway>(QueueGateway);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
    friendsService = module.get(FriendsService);
    events = module.get(Events);
  });

  beforeEach(() => {
    queueService.join.mockReturnValue([
      {
        id: 5,
        playerId: new Types.ObjectId() as PlayerId,
        gameClass: Tf2ClassName.scout,
        ready: false,
      },
    ]);
    queueService.leave.mockReturnValue({
      id: 0,
      playerId: new Types.ObjectId() as PlayerId,
      gameClass: Tf2ClassName.scout,
      ready: false,
    });
    queueService.readyUp.mockReturnValue({
      id: 0,
      playerId: new Types.ObjectId() as PlayerId,
      gameClass: Tf2ClassName.scout,
      ready: true,
    });
    queueAnnouncementsService.substituteRequests.mockResolvedValue(
      mockSubstituteRequests,
    );

    socket = {
      emit: jest.fn(),
    } as any;
  });

  beforeEach(() => {
    gateway.onModuleInit();
    gateway.afterInit(socket);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('#joinQueue()', () => {
    it('should join the queue', () => {
      const playerId = new Types.ObjectId() as PlayerId;
      gateway.joinQueue({ user: { _id: playerId } } as Socket, {
        slotId: 5,
      });
      expect(queueService.join).toHaveBeenCalledWith(5, playerId);
    });
  });

  describe('#leaveQueue()', () => {
    it('should leave the queue', () => {
      const playerId = new Types.ObjectId() as PlayerId;
      gateway.leaveQueue({
        user: { _id: playerId },
      } as Socket);
      expect(queueService.leave).toHaveBeenCalledWith(playerId);
    });
  });

  describe('#playerReady()', () => {
    it('should ready up the player', () => {
      const playerId = new Types.ObjectId() as PlayerId;
      gateway.playerReady({
        user: { _id: playerId },
      } as Socket);
      expect(queueService.readyUp).toHaveBeenCalledWith(playerId);
    });
  });

  describe('#markFriend()', () => {
    it('should mark friend', () => {
      const playerId = new Types.ObjectId() as PlayerId;
      const friendPlayerId = new Types.ObjectId() as PlayerId;
      gateway.markFriend({ user: { _id: playerId } } as Socket, {
        friendPlayerId,
      });
      expect(friendsService.markFriend).toHaveBeenCalledWith(
        playerId,
        friendPlayerId,
      );
    });
  });

  describe('#voteForMap()', () => {
    it('should vote for the map', () => {
      const playerId = new Types.ObjectId() as PlayerId;
      const ret = gateway.voteForMap({ user: { _id: playerId } } as Socket, {
        map: 'cp_badlands',
      });
      expect(mapVoteService.voteForMap).toHaveBeenCalledWith(
        playerId,
        'cp_badlands',
      );
      expect(ret).toEqual('cp_badlands');
    });
  });

  describe('when the queueSlotsChange event is fired', () => {
    beforeEach(() => {
      events.queueSlotsChange.next({
        slots: [
          {
            id: 0,
            playerId: new Types.ObjectId() as PlayerId,
            ready: true,
            gameClass: Tf2ClassName.soldier,
          },
        ],
      });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('queue slots update', [
        expect.any(Object),
      ]);
    });
  });

  describe('when the queueStateChange event is fired', () => {
    beforeEach(() => {
      events.queueStateChange.next({ state: QueueState.ready });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('queue state update', 'ready');
    });
  });

  describe('when the queueFriendshipsChange event is fired', () => {
    beforeEach(() => {
      events.queueFriendshipsChange.next({ friendships: [] });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith('friendships update', []);
    });
  });

  describe('when the mapVotesChange event is fired', () => {
    const results = [
      { map: 'cp_process_final', voteCount: 0 },
      { map: 'cp_gullywash_final1', voteCount: 0 },
      { map: 'cp_metalworks', voteCount: 1 },
    ];

    beforeEach(() => {
      events.mapVotesChange.next({ results });
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith(
        'map vote results update',
        results,
      );
    });
  });

  describe('when the substituteRequestsChange is fired', () => {
    beforeEach(() => {
      events.substituteRequestsChange.next();
    });

    it('should emit the event over the socket', () => {
      expect(socket.emit).toHaveBeenCalledWith(
        'substitute requests update',
        mockSubstituteRequests,
      );
    });
  });
});
