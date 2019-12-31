import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { AuthModule } from '@/auth/auth.module';
import { PlayersModule } from '@/players/players.module';
import { GamesModule } from '@/games/games.module';
import { QueueModule } from '@/queue/queue.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,

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
