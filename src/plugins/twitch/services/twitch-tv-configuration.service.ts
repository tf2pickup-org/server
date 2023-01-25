import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class TwitchTvConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry('twitchtv.promoted_streams', z.array(z.string()), [
        'teamfortresstv',
        'teamfortresstv2',
        'teamfortresstv3',
        'kritzkast',
        'kritzkast2',
        'rglgg',
        'essentialstf',
        'cappingtv',
        'cappingtv2',
        'cappingtv3',
        'tflivetv',
      ]),
    );
  }
}
