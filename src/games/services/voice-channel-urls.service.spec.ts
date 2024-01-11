import { Test, TestingModule } from '@nestjs/testing';
import { VoiceChannelUrlsService } from './voice-channel-urls.service';
import { Game } from '../models/game';
import { Player } from '@/players/models/player';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { CacheModule } from '@nestjs/cache-manager';
import { Events } from '@/events/events';
import { GameState } from '../models/game-state';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { GameId } from '../game-id';
import { Tf2Team } from '../models/tf2-team';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { SlotStatus } from '../models/slot-status';
import { GameSlot } from '../models/game-slot';
import { VoiceServerType } from '../voice-server-type';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';

const mockGame = new Game();
const mockPlayer = new Player();

jest.mock('./games.service', () => ({
  GamesService: jest.fn().mockImplementation(() => ({
    getById: jest.fn().mockResolvedValue(mockGame),
  })),
}));

jest.mock('@/players/services/players.service', () => ({
  PlayersService: jest.fn().mockImplementation(() => ({
    getById: jest.fn().mockResolvedValue(mockPlayer),
  })),
}));

jest.mock('@/configuration/services/configuration.service');

beforeEach(() => {
  mockPlayer._id = new Types.ObjectId() as PlayerId;
  mockPlayer.name = 'fake_player_1';

  mockGame._id = new Types.ObjectId() as GameId;
  mockGame.state = GameState.created;
  mockGame.number = 512;
  mockGame.slots = [
    {
      player: mockPlayer._id,
      team: Tf2Team.blu,
      gameClass: Tf2ClassName.scout,
      status: SlotStatus.active,
    } as GameSlot,
  ];
});

describe('VoiceChannelUrlsService', () => {
  let service: VoiceChannelUrlsService;
  let playersService: jest.Mocked<PlayersService>;
  let configurationService: jest.Mocked<ConfigurationService>;
  let configuration: Record<string, unknown>;
  let events: Events;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        VoiceChannelUrlsService,
        GamesService,
        PlayersService,
        ConfigurationService,
        Events,
      ],
    }).compile();

    service = module.get<VoiceChannelUrlsService>(VoiceChannelUrlsService);
    playersService = module.get(PlayersService);
    configurationService = module.get(ConfigurationService);
    events = module.get(Events);
  });

  beforeEach(() => {
    configuration = {
      'games.default_player_skill': {
        [Tf2ClassName.scout]: 2,
        [Tf2ClassName.soldier]: 3,
        [Tf2ClassName.demoman]: 4,
        [Tf2ClassName.medic]: 5,
      },
    };

    configurationService.get.mockImplementation((key: string) =>
      Promise.resolve(configuration[key]),
    );

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getVoiceChannelUrl()', () => {
    describe('when the game is running', () => {
      beforeEach(() => {
        mockGame.state = GameState.started;
      });

      describe('when the voice server is none', () => {
        beforeEach(() => {
          configuration['games.voice_server_type'] = VoiceServerType.none;
        });

        it('should return null', async () => {
          expect(
            await service.getVoiceChannelUrl(mockGame._id, mockPlayer._id),
          ).toBe(null);
        });
      });

      describe('when the voice server is a static link', () => {
        beforeEach(() => {
          configuration['games.voice_server_type'] = VoiceServerType.staticLink;
          configuration['games.voice_server.static_link'] = 'SOME_STATIC_LINK';
        });

        it('should return the static link', async () => {
          expect(
            await service.getVoiceChannelUrl(mockGame._id, mockPlayer._id),
          ).toEqual('SOME_STATIC_LINK');
        });

        describe('but the configuration changes to none', () => {
          beforeEach(async () => {
            await service.getVoiceChannelUrl(mockGame._id, mockPlayer._id);
            configuration['games.voice_server_type'] = VoiceServerType.none;
            events.configurationChanged.next({
              key: 'games.voice_server_type',
              oldValue: VoiceServerType.staticLink,
              newValue: VoiceServerType.none,
            });
          });

          it('should return null', async () => {
            expect(
              await service.getVoiceChannelUrl(mockGame._id, mockPlayer._id),
            ).toBe(null);
          });
        });
      });

      describe('when the voice server is a mumble server', () => {
        beforeEach(() => {
          configuration['games.voice_server_type'] = VoiceServerType.mumble;
          configuration['games.voice_server.mumble.url'] = 'melkor.tf';
          configuration['games.voice_server.mumble.port'] = 64738;
          configuration['games.voice_server.mumble.channel_name'] =
            'FAKE_CHANNEL_NAME';
        });

        it('should return direct mumble channel url', async () => {
          const url = await service.getVoiceChannelUrl(
            mockGame._id,
            mockPlayer._id,
          );
          expect(url).toEqual(
            'mumble://fake_player_1@melkor.tf:64738/FAKE_CHANNEL_NAME/512/BLU',
          );
        });

        describe('when the mumble server has a password', () => {
          beforeEach(() => {
            configuration['games.voice_server_type'] = VoiceServerType.mumble;
            configuration['games.voice_server.mumble.url'] = 'melkor.tf';
            configuration['games.voice_server.mumble.port'] = 64738;
            configuration['games.voice_server.mumble.channel_name'] =
              'FAKE_CHANNEL_NAME';
            configuration['games.voice_server.mumble.password'] =
              'FAKE_SERVER_PASSWORD';
          });

          it('should handle the password in the url', async () => {
            const url = await service.getVoiceChannelUrl(
              mockGame._id,
              mockPlayer._id,
            );
            expect(url).toEqual(
              'mumble://fake_player_1:FAKE_SERVER_PASSWORD@melkor.tf:64738/FAKE_CHANNEL_NAME/512/BLU',
            );
          });
        });

        describe('when mumble configuration is malformed', () => {
          beforeEach(() => {
            configuration['games.voice_server_type'] = VoiceServerType.mumble;
            configuration['games.voice_server.mumble.url'] = null;
            configuration['games.voice_server.mumble.port'] = null;
            configuration['games.voice_server.mumble.channel_name'] = null;
          });

          it('should throw an error', async () => {
            await expect(
              service.getVoiceChannelUrl(mockGame._id, mockPlayer._id),
            ).rejects.toThrow(Error);
          });
        });
      });

      describe('when a player is not part of the game', () => {
        let anotherPlayer: Player;

        beforeEach(() => {
          anotherPlayer = new Player();
          anotherPlayer._id = new Types.ObjectId() as PlayerId;
          playersService.getById.mockResolvedValue(anotherPlayer);
        });

        it('should throw an error', async () => {
          await expect(
            service.getVoiceChannelUrl(mockGame._id, anotherPlayer._id),
          ).rejects.toThrow(PlayerNotInThisGameError);
        });
      });
    });

    describe('when the game is not running', () => {
      beforeEach(() => {
        mockGame.state = GameState.ended;
      });

      it('should throw an error', async () => {
        await expect(
          service.getVoiceChannelUrl(mockGame._id, mockPlayer._id),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });
  });
});
