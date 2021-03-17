import { Events } from '@/events/events';
import { Player } from '@/players/models/player';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { WebsocketEvent } from '@/websocket-event';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileUpdaterService } from './profile-updater.service';

jest.mock('@/players/services/online-players.service');

describe('ProfileUpdaterService', () => {
  let service: ProfileUpdaterService;
  let events: Events;
  let onlinePlayersService: jest.Mocked<OnlinePlayersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileUpdaterService,
        Events,
        OnlinePlayersService,
      ],
    }).compile();

    service = module.get<ProfileUpdaterService>(ProfileUpdaterService);
    events = module.get(Events);
    onlinePlayersService = module.get(OnlinePlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when initialized', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should send an event over ws whenever a player is updated', () => {
      const socket = { emit: jest.fn() };
      onlinePlayersService.getSocketsForPlayer.mockReturnValue([ socket as any ]);

      events.playerUpdates.next({ oldPlayer: null, newPlayer: { id: 'FAKE_PLAYER_ID' } as Player });
      expect(socket.emit).toHaveBeenCalledWith(WebsocketEvent.profileUpdate, { id: 'FAKE_PLAYER_ID' });
    });
  });
});
