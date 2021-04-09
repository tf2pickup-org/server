import { Module, Global } from '@nestjs/common';
import { Environment } from './environment';

@Global()
@Module({
  providers: [Environment],
  exports: [Environment],
})
export class EnvironmentModule {}
