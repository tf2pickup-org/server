import { Controller, Get } from '@nestjs/common';
import { version } from 'package.json';
import { Environment } from './environment/environment';

@Controller()
export class AppController {

  constructor(
    private environment: Environment,
  ) { }

  @Get()
  index() {
    return {
      version,
      clientUrl: this.environment.clientUrl,
      loginUrl: `${this.environment.apiUrl}/auth/steam`,
    };
  }
}
