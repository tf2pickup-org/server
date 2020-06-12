import { Module } from '@nestjs/common';
import { DiscordService } from './services/discord.service';

@Module({
  providers: [
    DiscordService,
  ],
  exports: [
    DiscordService,
  ],
})
export class DiscordModule { }
