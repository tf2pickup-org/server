import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { AuthModule } from '@/auth/auth.module';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { QueueModule } from '@/queue/queue.module';
import { PlayerPreferencesModule } from '@/player-preferences/player-preferences.module';
import { ProfileService } from './services/profile.service';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { QueueConfigModule } from '@/queue-config/queue-config.module';

@Module({
  imports: [
    AuthModule,
    GamesModule,
    PlayersModule,
    QueueModule,
    PlayerPreferencesModule,
    ConfigurationModule,
    QueueConfigModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
