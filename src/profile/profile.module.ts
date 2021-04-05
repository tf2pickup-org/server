import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { AuthModule } from '@/auth/auth.module';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { QueueModule } from '@/queue/queue.module';
import { PlayerPreferencesModule } from '@/player-preferences/player-preferences.module';

@Module({
  imports: [
    AuthModule,
    GamesModule,
    PlayersModule,
    QueueModule,
    PlayerPreferencesModule,
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
