import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { AuthModule } from '@/auth/auth.module';
import { PlayersModule } from '@/players/players.module';

@Module({
  imports: [
    AuthModule,
    PlayersModule,
  ],
  controllers: [
    ProfileController,
  ],
})
export class ProfileModule { }
