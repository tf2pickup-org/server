import { ConfigurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { VoiceServerType } from '../voice-server-type';

@Injectable()
export class GamesConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  async onModuleInit() {
    const entries: ConfigurationEntry[] = [
      {
        key: 'games.default_player_skill',
        schema: z.record(z.nativeEnum(Tf2ClassName), z.number()),
        default: Object.fromEntries(
          Object.values(Tf2ClassName).map((className) => [className, 1]),
        ),
      },
      {
        key: 'games.whitelist_id',
        schema: z.string().optional(),
        default: undefined,
      },
      {
        key: 'games.voice_server_type',
        schema: z.nativeEnum(VoiceServerType),
        default: VoiceServerType.none,
      },
      {
        key: 'games.voice_server.static_link',
        schema: z.string().url().optional(),
        default: undefined,
      },
      {
        key: 'games.voice_server.mumble.url',
        schema: z.string().url().optional(),
        default: undefined,
      },
      {
        key: 'games.voice_server.mumble.port',
        schema: z.number().gte(0).lte(65535).optional(),
        default: 64738,
      },
      {
        key: 'games.voice_server.mumble.channel_name',
        schema: z.string().optional(),
        default: undefined,
      },
      {
        key: 'games.voice_server.mumble.password',
        schema: z.string().optional(),
        default: undefined,
      },
      {
        key: 'games.join_gameserver_timeout',
        schema: z.number(),
        default: 5 * 60 * 1000, // 5 minutes
      },
    ];

    entries.forEach((entry) => this.configurationService.register(entry));
  }
}
