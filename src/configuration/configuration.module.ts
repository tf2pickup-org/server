import { Module } from '@nestjs/common';
import { ConfigurationService } from './services/configuration.service';
import { ConfigurationController } from './controllers/configuration.controller';
import {
  ConfigurationEntry,
  configurationEntrySchema,
} from './models/configuration-entry';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigurationEntryKey } from './models/configuration-entry-key';
import { defaultPlayerSkillSchema } from './models/default-player-skill';
import { whitelistIdSchema } from './models/whitelist-id';
import { etf2lAccountRequiredSchema } from './models/etf2l-account-required';
import { minimumTf2InGameHoursSchema } from './models/minimum-tf2-in-game-hours';
import { voiceServerSchema } from './models/voice-server';
import { discordSchema } from './models/discord';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ConfigurationEntry.name,
        schema: configurationEntrySchema,
        discriminators: [
          {
            name: ConfigurationEntryKey.defaultPlayerSkill,
            schema: defaultPlayerSkillSchema,
          },
          {
            name: ConfigurationEntryKey.whitelistId,
            schema: whitelistIdSchema,
          },
          {
            name: ConfigurationEntryKey.etf2lAccountRequired,
            schema: etf2lAccountRequiredSchema,
          },
          {
            name: ConfigurationEntryKey.minimumTf2InGameHours,
            schema: minimumTf2InGameHoursSchema,
          },
          {
            name: ConfigurationEntryKey.voiceServer,
            schema: voiceServerSchema,
          },
          {
            name: ConfigurationEntryKey.discord,
            schema: discordSchema,
          },
        ],
      },
    ]),
  ],
  providers: [ConfigurationService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
