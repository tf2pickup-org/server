import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { AuthModule } from '@/auth/auth.module';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { QueueModule } from '@/queue/queue.module';

@Module({
  imports: [
    AuthModule,
    GamesModule,
    PlayersModule,
    QueueModule,
  ],
  controllers: [
    ProfileController,
  ],
})
export class ProfileModule { }
