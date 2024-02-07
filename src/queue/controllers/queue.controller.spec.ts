import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MapPoolService } from '../services/map-pool.service';
import { QueueState } from '../queue-state';
import { MapPoolEntry } from '../models/map-pool-entry';
import { Player } from '@/players/models/player';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { QUEUE_CONFIG } from '@/queue-config/tokens/queue-config.token';

jest.mock('../services/queue.service');
jest.mock('../services/map-vote.service');
jest.mock('../services/queue-announcements.service');
jest.mock('../services/friends.service');
jest.mock('../services/map-pool.service');

describe('Queue Controller', () => {
  let controller: QueueController;
  let queueService: jest.Mocked<QueueService>;
  let mapVoteService: jest.Mocked<MapVoteService>;
  let queueAnnouncementsService: jest.Mocked<QueueAnnouncementsService>;
  let friendsService: jest.Mocked<FriendsService>;
  let mapPoolService: jest.Mocked<MapPoolService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        MapVoteService,
        QueueAnnouncementsService,
        FriendsService,
        MapPoolService,
        { provide: QUEUE_CONFIG, useValue: {} },
      ],
      controllers: [QueueController],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
    friendsService = module.get(FriendsService);
    mapPoolService = module.get(MapPoolService);
  });

  beforeEach(() => {
    queueService.slots = [
      {
        id: 0,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: new Types.ObjectId() as PlayerId,
      },
      {
        id: 1,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: null,
      },
    ];
    queueService.state = QueueState.waiting;

    queueAnnouncementsService.substituteRequests.mockResolvedValue([
      {
        gameId: 'FAKE_GAME_ID',
        gameNumber: 514,
        gameClass: Tf2ClassName.soldier,
        team: 'BLU',
      },
    ]);

    friendsService.friendships = [
      {
        sourcePlayerId: new Types.ObjectId() as PlayerId,
        targetPlayerId: new Types.ObjectId() as PlayerId,
      },
    ];

    Object.defineProperty(mapVoteService, 'results', {
      get: jest.fn().mockReturnValue([]),
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getQueue()', () => {
    it('should return current queue data', async () => {
      const ret = await controller.getQueue();
      expect(ret).toMatchObject({
        config: expect.any(Object),
        slots: expect.any(Array),
        state: 'waiting',
        mapVoteResults: expect.any(Array),
        substituteRequests: expect.any(Array),
        friendships: expect.any(Array),
      });
    });
  });

  describe('#getQueueState()', () => {
    it('should return queue state', () => {
      expect(controller.getQueueState()).toEqual(queueService.state);
    });
  });

  describe('#getQueueSlots()', () => {
    it('should return queue slots', () => {
      const slots = controller.getQueueSlots();
      expect(slots.length).toBe(2);
    });
  });

  describe('#getMapVoteResults()', () => {
    it('should return map vote results', () => {
      expect(controller.getMapVoteResults()).toEqual(mapVoteService.results);
    });
  });

  describe('#scrambleMaps()', () => {
    it('should scramble the maps', async () => {
      const playerId = new Types.ObjectId() as PlayerId;
      await controller.scrambleMaps({ _id: playerId } as Player);
      expect(mapVoteService.scramble).toHaveBeenCalledWith(playerId);
    });
  });

  describe('#getSubstituteRequests()', () => {
    it('should return substitute requests', async () => {
      expect(await controller.getSubstituteRequests()).toEqual([
        {
          gameId: 'FAKE_GAME_ID',
          gameNumber: 514,
          gameClass: Tf2ClassName.soldier,
          team: 'BLU',
        },
      ]);
    });
  });

  describe('#getFriendships()', () => {
    it('should return the frienships', () => {
      expect(controller.getFriendships()).toEqual([
        {
          sourcePlayerId: expect.any(Types.ObjectId),
          targetPlayerId: expect.any(Types.ObjectId),
        },
      ]);
    });
  });

  describe('#getMaps()', () => {
    beforeEach(() => {
      mapPoolService.getMaps.mockResolvedValue([
        new MapPoolEntry('cp_badlands', 'etf2l_6v6_5cp'),
      ]);
    });

    it('should return the maps in the map pool', async () => {
      expect(await controller.getMaps()).toEqual([
        { name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' },
      ]);
    });
  });

  describe('#addMap()', () => {
    beforeEach(() => {
      mapPoolService.addMap.mockImplementation((map) =>
        Promise.resolve(new MapPoolEntry(map.name, map.execConfig)),
      );
    });

    it('should add the map', async () => {
      const ret = await controller.addMap(
        new MapPoolEntry('cp_badlands', 'etf2l_6v6_5cp'),
      );
      expect(ret).toEqual({ name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' });
      expect(mapPoolService.addMap).toHaveBeenCalledWith({
        name: 'cp_badlands',
        execConfig: 'etf2l_6v6_5cp',
      });
    });
  });

  describe('#deleteMap()', () => {
    beforeEach(() => {
      mapPoolService.removeMap.mockImplementation((name) =>
        Promise.resolve(new MapPoolEntry(name, 'etf2l_6v6_5cp')),
      );
    });

    it('should remote the map', async () => {
      const ret = await controller.deleteMap('cp_badlands');
      expect(ret).toEqual({ name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' });
      expect(mapPoolService.removeMap).toHaveBeenCalledWith('cp_badlands');
    });
  });

  describe('#setMaps()', () => {
    beforeEach(() => {
      mapPoolService.setMaps.mockImplementation((maps) =>
        Promise.resolve(maps),
      );
    });

    it('should set the maps', async () => {
      const ret = await controller.setMaps([
        new MapPoolEntry('cp_badlands'),
        new MapPoolEntry('cp_process_final', 'etf2l_6v6_5cp'),
      ]);
      expect(ret).toEqual([
        { name: 'cp_badlands' },
        { name: 'cp_process_final', execConfig: 'etf2l_6v6_5cp' },
      ]);
      expect(mapPoolService.setMaps).toHaveBeenCalledWith([
        { name: 'cp_badlands' },
        { name: 'cp_process_final', execConfig: 'etf2l_6v6_5cp' },
      ]);
    });
  });
});
