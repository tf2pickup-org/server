import { CertificatesModule } from '@/certificates/certificates.module';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { EventsModule } from '@/events/events.module';
import { GameCoordinatorModule } from '@/game-coordinator/game-coordinator.module';
import { GamesModule } from '@/games/games.module';
import { Module } from '@nestjs/common';
import { MumbleBotService } from './mumble-bot.service';

@Module({
  imports: [
    ConfigurationModule,
    EventsModule,
    CertificatesModule,
    GamesModule,
    GameCoordinatorModule,
  ],
  providers: [MumbleBotService],
})
export class VoiceServersModule {}
