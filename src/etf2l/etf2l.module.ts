import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Etf2lApiService } from './services/etf2l-api.service';

@Module({
  imports: [HttpModule],
  providers: [Etf2lApiService],
  exports: [Etf2lApiService],
})
export class Etf2lModule {}
