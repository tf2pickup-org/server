import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueConfigService } from '../services/queue-config.service';
import { QueueService } from '../services/queue.service';
import { MapVoteService } from '../services/map-vote.service';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { PlayerPopulatorService } from '../services/player-populator.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { MapPoolService } from '../services/map-pool.service';
import { Player } from '@/players/models/player';

jest.mock('../services/queue-config.service');
jest.mock('../services/queue.service');
jest.mock('../services/map-vote.service');
jest.mock('../services/player-populator.service');
jest.mock('../services/queue-announcements.service');
jest.mock('../services/friends.service');
jest.mock('../services/map-pool.service');

describe('Queue Controller', () => {
  let controller: QueueController;
  let queueConfigService: jest.Mocked<QueueConfigService>;
  let queueService: jest.Mocked<QueueService>;
  let mapVoteService: jest.Mocked<MapVoteService>;
  let queueAnnouncementsService: jest.Mocked<QueueAnnouncementsService>;
  let friendsService: jest.Mocked<FriendsService>;
  let playerPopulatorService: jest.Mocked<PlayerPopulatorService>;
  let mapPoolService: jest.Mocked<MapPoolService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueConfigService,
        QueueService,
        MapVoteService,
        QueueAnnouncementsService,
        FriendsService,
        PlayerPopulatorService,
        MapPoolService,
      ],
      controllers: [QueueController],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueConfigService = module.get(QueueConfigService);
    queueService = module.get(QueueService);
    mapVoteService = module.get(MapVoteService);
    queueAnnouncementsService = module.get(QueueAnnouncementsService);
    friendsService = module.get(FriendsService);
    playerPopulatorService = module.get(PlayerPopulatorService);
    mapPoolService = module.get(MapPoolService);
  });

  beforeEach(() => {
    // @ts-expect-error
    queueConfigService.queueConfig = { some_param: 'some_value' };

    queueService.slots = [
      {
        id: 0,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: 'FAKE_ID',
      },
      { id: 1, gameClass: Tf2ClassName.soldier, ready: false, playerId: null },
    ];
    queueService.state = 'waiting';

    queueAnnouncementsService.substituteRequests.mockResolvedValue([
      {
        gameId: 'FAKE_GAME_ID',
        gameNumber: 514,
        gameClass: Tf2ClassName.soldier,
        team: 'BLU',
      },
    ]);

    friendsService.friendships = [
      { sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' },
    ];

    // @ts-expect-error
    mapVoteService.results = [];

    playerPopulatorService.populatePlayers.mockResolvedValue([
      {
        id: 0,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: 'FAKE_ID',
        player: { id: 'FAKE_ID' } as Player,
      },
      {
        id: 1,
        gameClass: Tf2ClassName.soldier,
        ready: false,
        playerId: null,
        player: null,
      },
    ]);
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

  describe('#getQueueConfig()', () => {
    it('should return queue config', () => {
      expect(controller.getQueueConfig()).toEqual(
        queueConfigService.queueConfig,
      );
    });
  });

  describe('#getQueueState()', () => {
    it('should return queue state', () => {
      expect(controller.getQueueState()).toEqual(queueService.state);
    });
  });

  describe('#getQueueSlots()', () => {
    it('should return queue slots', () => {
      expect(controller.getQueueSlots()).toEqual([
        {
          id: 0,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: 'FAKE_ID',
        },
        {
          id: 1,
          gameClass: Tf2ClassName.soldier,
          ready: false,
          playerId: null,
        },
      ]);
    });
  });

  describe('#getMapVoteResults()', () => {
    it('should return map vote results', () => {
      expect(controller.getMapVoteResults()).toEqual(mapVoteService.results);
    });
  });

  describe('#scrambleMaps()', () => {
    it('should scramble the maps', async () => {
      await controller.scrambleMaps();
      expect(mapVoteService.scramble).toHaveBeenCalled();
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
        { sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' },
      ]);
    });
  });

  describe('#getMaps()', () => {
    beforeEach(() => {
      mapPoolService.getMaps.mockResolvedValue([
        { name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' },
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
      mapPoolService.addMap.mockResolvedValue({
        name: 'cp_badlands',
        execConfig: 'etf2l_6v6_5cp',
      });
    });

    it('should add the map', async () => {
      const ret = await controller.addMap({
        name: 'cp_badlands',
        execConfig: 'etf2l_6v6_5cp',
      });
      expect(ret).toEqual({ name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' });
      expect(mapPoolService.addMap).toHaveBeenCalledWith({
        name: 'cp_badlands',
        execConfig: 'etf2l_6v6_5cp',
      });
    });
  });

  describe('#deleteMap()', () => {
    beforeEach(() => {
      mapPoolService.removeMap.mockResolvedValue({
        name: 'cp_badlands',
        execConfig: 'etf2l_6v6_5cp',
      });
    });

    it('should remote the map', async () => {
      const ret = await controller.deleteMap('cp_badlands');
      expect(ret).toEqual({ name: 'cp_badlands', execConfig: 'etf2l_6v6_5cp' });
      expect(mapPoolService.removeMap).toHaveBeenCalledWith('cp_badlands');
    });
  });

  describe('#setMaps()', () => {
    beforeEach(() => {
      mapPoolService.setMaps.mockResolvedValue([
        { name: 'cp_badlands' },
        { name: 'cp_process_final', execConfig: 'etf2l_6v6_5cp' },
      ]);
    });

    it('should set the maps', async () => {
      const ret = await controller.setMaps([
        { name: 'cp_badlands' },
        { name: 'cp_process_final', execConfig: 'etf2l_6v6_5cp' },
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
