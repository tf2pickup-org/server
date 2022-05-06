import { Module } from '@nestjs/common';
import { MumbleBotService } from './mumble-bot.service';

@Module({
  providers: [MumbleBotService]
})
export class VoiceServersModule {}
