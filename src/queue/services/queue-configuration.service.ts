import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class QueueConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry(
        'queue.deny_players_with_no_skill_assigned',
        z.boolean(),
        false,
      ),
      configurationEntry(
        'queue.ready_up_timeout',
        z.number().positive(),
        40 * 1000,
        'Time players have to ready up before they are kicked out of the queue',
      ),
      configurationEntry(
        'queue.ready_state_timeout',
        z.number().positive(),
        60 * 1000,
        'Time the queue stays in the ready-up state before going back to the waiting state, unless all players ready up',
      ),
      configurationEntry(
        'queue.map_cooldown',
        z.number().positive(),
        2,
        'How many times the last played map cannot be an option to vote for.',
      ),
    );
  }
}
