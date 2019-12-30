import { Module, Global } from '@nestjs/common';
import { Environment } from './environment';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    Environment,
  ],
  exports: [
    Environment,
  ],
})
export class EnvironmentModule { }
