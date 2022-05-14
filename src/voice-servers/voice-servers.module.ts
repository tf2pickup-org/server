import { CertificatesModule } from '@/certificates/certificates.module';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { EventsModule } from '@/events/events.module';
import { GamesModule } from '@/games/games.module';
import { Module } from '@nestjs/common';
import { MumbleBotService } from './mumble-bot.service';

@Module({
  imports: [ConfigurationModule, EventsModule, CertificatesModule, GamesModule],
  providers: [MumbleBotService],
})
export class VoiceServersModule {}
