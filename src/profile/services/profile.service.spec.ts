import { Events } from '@/events/events';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { WebsocketEvent } from '@/websocket-event';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';

jest.mock('@/players/services/online-players.service');
jest.mock('@/players/services/linked-profiles.service');

describe('ProfileService', () => {
  let service: ProfileService;
  let onlinePlayersService: jest.Mocked<OnlinePlayersService>;
  let linkedProfilesService: jest.Mocked<LinkedProfilesService>;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        Events,
        OnlinePlayersService,
        LinkedProfilesService,
      ],
    }).compile();

    onlinePlayersService = module.get(OnlinePlayersService);
    linkedProfilesService = module.get(LinkedProfilesService);
    events = module.get(Events);
    service = module.get<ProfileService>(ProfileService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update profile on linkedProfilesChanged event', async () =>
    new Promise<void>((resolve) => {
      const socket = {
        emit: jest.fn().mockImplementation((eventName, data) => {
          expect(eventName).toEqual(WebsocketEvent.profileUpdate);
          expect(data).toMatchObject({
            linkedProfiles: [],
          });
          resolve();
        }),
      };

      onlinePlayersService.getSocketsForPlayer.mockReturnValue([socket as any]);
      linkedProfilesService.getLinkedProfiles.mockResolvedValue([]);
      events.linkedProfilesChanged.next({ playerId: 'FAKE_PLAYER_ID' });
    }));
});
