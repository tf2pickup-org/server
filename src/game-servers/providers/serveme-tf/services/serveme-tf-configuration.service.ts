import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ServemeTfConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  async onModuleInit() {
    this.configurationService.register(
      configurationEntry(
        'serveme_tf.preferred_region',
        z.string().optional(),
        undefined,
      ),
    );
  }

  async getPreferredRegion(): Promise<string | undefined> {
    return await this.configurationService.get<string | undefined>(
      'serveme_tf.preferred_region',
    );
  }
}
