import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { GamesService } from './games.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GameId } from '../game-id';
import { PlayerId } from '@/players/types/player-id';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { PlayersService } from '@/players/services/players.service';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { VoiceServerType } from '../voice-server-type';
import { isUndefined } from 'lodash';
import { Events } from '@/events/events';
import { filter } from 'rxjs';

const cacheKey = (gameId: GameId, playerId: PlayerId): string =>
  `voice-channel-url/${gameId.toString()}/${playerId.toString()}`;

const nullValue = 'null';

@Injectable()
export class VoiceChannelUrlsService implements OnModuleInit {
  constructor(
    private readonly gamesService: GamesService,
    private readonly playersService: PlayersService,
    private readonly configurationService: ConfigurationService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly events: Events,
  ) {}

  onModuleInit() {
    this.events.configurationChanged
      .pipe(filter(({ key }) => key.startsWith('games.voice_server')))
      .subscribe(async () => {
        const keys = await this.cache.store.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('voice-channel-url'))
            .map(async (key) => await this.cache.del(key)),
        );
      });
  }

  async getVoiceChannelUrl(
    gameId: GameId,
    playerId: PlayerId,
  ): Promise<string | null> {
    const key = cacheKey(gameId, playerId);
    let value = await this.cache.get<string>(key);
    if (isUndefined(value)) {
      value = await this.calculateVoiceChannelUrl(gameId, playerId);
      await this.cache.set(key, value);
    }

    return value === nullValue ? null : value;
  }

  private async calculateVoiceChannelUrl(
    gameId: GameId,
    playerId: PlayerId,
  ): Promise<string> {
    const game = await this.gamesService.getById(gameId);
    if (!game.isInProgress()) {
      throw new GameInWrongStateError(gameId, game.state);
    }

    const player = await this.playersService.getById(playerId);
    const slot = game.findPlayerSlot(playerId);
    if (!slot) {
      throw new PlayerNotInThisGameError(playerId, gameId);
    }

    const voiceServerType =
      await this.configurationService.get<VoiceServerType>(
        'games.voice_server_type',
      );
    switch (voiceServerType) {
      case VoiceServerType.none:
        return nullValue;

      case VoiceServerType.staticLink:
        return await this.configurationService.get<string>(
          'games.voice_server.static_link',
        );

      case VoiceServerType.mumble: {
        const [url, port, channelName, password] = await Promise.all([
          this.configurationService.get<string>(
            'games.voice_server.mumble.url',
          ),
          this.configurationService.get<number>(
            'games.voice_server.mumble.port',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.channel_name',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.password',
          ),
        ]);

        if (!url || !channelName) {
          throw Error('mumble configuration malformed');
        }

        const mumbleDirectLink = new URL(`mumble://${url}`);
        mumbleDirectLink.pathname = `${channelName}/${
          game.number
        }/${slot.team.toUpperCase()}`;
        mumbleDirectLink.username = player.name.replace(/\s+/g, '_');
        if (password) {
          mumbleDirectLink.password = password;
        }
        mumbleDirectLink.protocol = 'mumble:';
        mumbleDirectLink.port = `${port}`;
        return mumbleDirectLink.toString();
      }

      default:
        throw new Error('unknown voice server type');
    }
  }
}
