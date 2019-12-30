import { Module, Global } from '@nestjs/common';
import { Environment } from './environment';

@Global()
@Module({
  providers: [
    {
      provide: Environment,
      useValue: new Environment(`${process.env.NODE_ENV || 'development'}.env`),
    },
  ],
  exports: [
    Environment,
  ],
})
export class EnvironmentModule { }
