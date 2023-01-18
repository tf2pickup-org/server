import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { WebsocketEvent } from '@/websocket-event';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { Subject } from 'rxjs';
import { RestrictionReason } from '../interfaces/restriction';
import { ProfileService } from './profile.service';

jest.mock('@/players/services/online-players.service');
jest.mock('@/players/services/linked-profiles.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/queue/services/map-vote.service');
jest.mock('@/player-preferences/services/player-preferences.service');
jest.mock('@/configuration/services/configuration.service');

describe('ProfileService', () => {
  let service: ProfileService;
  let onlinePlayersService: jest.Mocked<OnlinePlayersService>;
  let linkedProfilesService: jest.Mocked<LinkedProfilesService>;
  let events: Events;
  let socketEvents: Subject<any>;
  let socket: any;
  let playerBansService: jest.Mocked<PlayerBansService>;
  let mapVoteService: jest.Mocked<MapVoteService>;
  let playerPreferencesService: jest.Mocked<PlayerPreferencesService>;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(() => {
    socketEvents = new Subject();
    socket = {
      emit: (eventName: string, data: any) =>
        socketEvents.next({ eventName, data }),
    };
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        Events,
        OnlinePlayersService,
        LinkedProfilesService,
        PlayerBansService,
        MapVoteService,
        PlayerPreferencesService,
        ConfigurationService,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
            teamCount: 2,
            classes: [
              {
                name: Tf2ClassName.scout,
                count: 2,
              },
              {
                name: Tf2ClassName.soldier,
                count: 2,
              },
              {
                name: Tf2ClassName.demoman,
                count: 1,
              },
              {
                name: Tf2ClassName.medic,
                count: 1,
              },
            ],
          },
        },
      ],
    }).compile();

    onlinePlayersService = module.get(OnlinePlayersService);
    linkedProfilesService = module.get(LinkedProfilesService);
    playerBansService = module.get(PlayerBansService);
    mapVoteService = module.get(MapVoteService);
    playerPreferencesService = module.get(PlayerPreferencesService);
    configurationService = module.get(ConfigurationService);

    onlinePlayersService.getSocketsForPlayer.mockReturnValue([socket]);

    events = module.get(Events);
    service = module.get<ProfileService>(ProfileService);
    service.onModuleInit();
  });

  afterEach(() => {
    socketEvents.complete();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update profile on linkedProfilesChanged event', () => {
    socketEvents.subscribe(({ eventName, data }) => {
      expect(eventName).toEqual(WebsocketEvent.profileUpdate);
      expect(data).toMatchObject({
        linkedProfiles: [],
      });
    });

    linkedProfilesService.getLinkedProfiles.mockResolvedValue([]);
    events.linkedProfilesChanged.next({ playerId: 'FAKE_PLAYER_ID' });
  });

  it('should update profile when active game is updated', () => {
    socketEvents.subscribe(({ eventName, data }) => {
      expect(eventName).toEqual(WebsocketEvent.profileUpdate);
      expect(data).toMatchObject({
        activeGameId: null,
      });
    });

    const oldPlayer = new Player();
    oldPlayer.joinedAt = new Date();
    oldPlayer.id = 'FAKE_PLAYER_ID';
    oldPlayer.name = 'FAKE_PLAYER_NAME';
    oldPlayer.activeGame = new Types.ObjectId();

    const newPlayer = new Player();
    newPlayer.joinedAt = oldPlayer.joinedAt;
    newPlayer.id = 'FAKE_PLAYER_ID';
    newPlayer.name = 'FAKE_PLAYER_NAME';

    events.playerUpdates.next({
      oldPlayer,
      newPlayer,
    });
  });

  describe('#getProfile()', () => {
    let player: Player;

    const bans: PlayerBan[] = [
      plainToInstance(PlayerBan, {
        id: 'FAKE_BAN_ID',
        player: new Types.ObjectId(),
        admin: new Types.ObjectId(),
        start: new Date(),
        end: new Date(),
        reason: 'FAKE_BAN_REASON',
      }),
    ];

    beforeEach(() => {
      player = new Player();
      player.joinedAt = new Date();
      player.id = 'FAKE_PLAYER_ID';
      player.hasAcceptedRules = true;

      playerBansService.getPlayerActiveBans.mockResolvedValue(bans);
      playerPreferencesService.getPlayerPreferences.mockResolvedValue(
        new Map([['FAKE_PREF', 'FAKE_PREF_VALUE']]),
      );
      linkedProfilesService.getLinkedProfiles.mockResolvedValue([]);
      configurationService.getDenyPlayersWithNoSkillAssigned.mockResolvedValue({
        key: ConfigurationEntryKey.denyPlayersWithNoSkillAssigned,
        value: false,
      });
      mapVoteService.playerVote.mockReturnValue('cp_badlands');
    });

    it('should return player profile', async () => {
      const profile = await service.getProfile(player);
      expect(profile.activeGameId).toBeUndefined();
      expect(profile.hasAcceptedRules).toBe(true);
      expect(profile.bans).toEqual(bans);
      expect(profile.mapVote).toEqual('cp_badlands');
      expect(profile.preferences).toEqual({ FAKE_PREF: 'FAKE_PREF_VALUE' });
      expect(profile.linkedProfiles).toEqual([]);
      expect(profile.restrictions).toEqual([]);
    });

    describe('if restricted', () => {
      beforeEach(() => {
        configurationService.getDenyPlayersWithNoSkillAssigned.mockResolvedValue(
          {
            key: ConfigurationEntryKey.denyPlayersWithNoSkillAssigned,
            value: true,
          },
        );
      });

      it('should return restriction', async () => {
        const profile = await service.getProfile(player);
        expect(profile.restrictions).toEqual([
          {
            reason: RestrictionReason.accountNeedsReview,
            gameClasses: [
              Tf2ClassName.scout,
              Tf2ClassName.soldier,
              Tf2ClassName.demoman,
              Tf2ClassName.medic,
            ],
          },
        ]);
      });
    });
  });
});
