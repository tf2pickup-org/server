import { Injectable } from '@nestjs/common';
import { GameServersService } from './game-servers.service';

@Injectable()
export class GameServerDiagnosticsService {

  constructor(
    private gameServersService: GameServersService,
  ) { }

}
