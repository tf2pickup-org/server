import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SteamApiService } from './services/steam-api.service';

@Module({
  imports: [HttpModule],
  providers: [SteamApiService],
  exports: [SteamApiService],
})
export class SteamModule {}
