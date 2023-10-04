import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { milliseconds } from 'date-fns';
import { z } from 'zod';
import { LogsTfUploadMethod } from '../logs-tf-upload-method';
import { VoiceServerType } from '../voice-server-type';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';

@Injectable()
export class GamesConfigurationService implements OnModuleInit {
  private readonly validClasses = this.queueConfig.classes.map(
    (gameClass) => gameClass.name,
  );

  constructor(
    private readonly configurationService: ConfigurationService,
    @Inject('QUEUE_CONFIG')
    private readonly queueConfig: QueueConfig,
  ) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry(
        'games.default_player_skill',
        z
          .record(z.nativeEnum(Tf2ClassName), z.number())
          .refine(
            (arg) =>
              Object.keys(arg).every((value) =>
                this.validClasses.includes(value as Tf2ClassName),
              ),
            {
              message: 'invalid gameClass name',
            },
          ),
        Object.fromEntries(
          this.validClasses.map((className) => [className, 1]),
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
        z.string().optional(),
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
      configurationEntry(
        'games.logs_tf_upload_method',
        z.nativeEnum(LogsTfUploadMethod),
        LogsTfUploadMethod.Backend,
        'Method of uploading logs to the logs.tf service',
      ),
      configurationEntry(
        'games.cooldown_levels',
        z.array(
          z.object({
            level: z.number().min(0),
            banLengthMs: z.number().min(0),
          }),
        ),
        [
          {
            level: 0,
            banLengthMs: milliseconds({ minutes: 30 }),
          },
          {
            level: 1,
            banLengthMs: milliseconds({ hours: 6 }),
          },
          {
            level: 2,
            banLengthMs: milliseconds({ hours: 24 }),
          },
          {
            level: 3,
            banLengthMs: milliseconds({ days: 2 }),
          },
          {
            level: 4,
            banLengthMs: milliseconds({ days: 7 }),
          },
          {
            level: 5,
            banLengthMs: milliseconds({ days: 14 }),
          },
          {
            level: 6,
            banLengthMs: milliseconds({ months: 1 }),
          },
          {
            level: 7,
            banLengthMs: milliseconds({ months: 2 }),
          },
          {
            level: 8,
            banLengthMs: milliseconds({ months: 3 }),
          },
          {
            level: 9,
            banLengthMs: milliseconds({ months: 6 }),
          },
          {
            level: 10,
            banLengthMs: milliseconds({ years: 1 }),
          },
        ],
      ),
      configurationEntry(
        'games.auto_force_end_threshold',
        z.number(),
        4,
        'Number of active substitute requests that make the game be automatically force-ended',
      ),
    );
  }
}
