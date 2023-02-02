import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { VoiceServerType } from '../voice-server-type';

@Injectable()
export class GamesConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry(
        'games.default_player_skill',
        z.record(z.nativeEnum(Tf2ClassName), z.number()),
        Object.fromEntries(
          Object.values(Tf2ClassName).map((className) => [className, 1]),
        ),
      ),
      configurationEntry(
        'games.whitelist_id',
        z.string().optional(),
        undefined,
      ),
      configurationEntry(
        'games.voice_server_type',
        z.nativeEnum(VoiceServerType),
        VoiceServerType.none,
      ),
      configurationEntry(
        'games.voice_server.static_link',
        z.string().url().optional(),
        undefined,
      ),
      configurationEntry(
        'games.voice_server.mumble.url',
        z.string().url().optional(),
        undefined,
      ),
      configurationEntry(
        'games.voice_server.mumble.port',
        z.number().gte(0).lte(65535).optional(),
        64738,
      ),
      configurationEntry(
        'games.voice_server.mumble.channel_name',
        z.string().optional(),
        undefined,
      ),
      configurationEntry(
        'games.voice_server.mumble.password',
        z.string().optional(),
        undefined,
      ),
      configurationEntry(
        'games.join_gameserver_timeout',
        z.number(),
        5 * 60 * 1000, // 5 minutes
        'Time a player has to connect after the gameserver is configured (milliseconds)',
      ),
      configurationEntry(
        'games.rejoin_gameserver_timeout',
        z.number(),
        3 * 60 * 1000, // 3 minutes
        'Time a player has to join the gameserver when they leave it during the game',
      ),
      configurationEntry(
        'games.execute_extra_commands',
        z.array(z.string()),
        [],
        'Execute extra commands via rcon upon configuring the game',
      ),
    );
  }
}
