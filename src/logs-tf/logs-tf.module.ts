import { Module } from '@nestjs/common';
import { LogsTfApiService } from './services/logs-tf-api.service';

@Module({
  providers: [LogsTfApiService],
  exports: [LogsTfApiService],
})
export class LogsTfModule {}
