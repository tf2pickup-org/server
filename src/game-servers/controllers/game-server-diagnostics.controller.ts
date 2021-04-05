import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-validation.pipe';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { GameServerDiagnosticRun } from '../models/game-server-diagnostic-run';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';

@Controller('game-server-diagnostics')
export class GameServerDiagnosticsController {
  constructor(
    private gameServerDiagnosticsService: GameServerDiagnosticsService,
  ) {}

  @Get(':id')
  @Auth(PlayerRole.superUser)
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getDiagnosticRun(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<GameServerDiagnosticRun> {
    return this.gameServerDiagnosticsService.getDiagnosticRunById(id);
  }
}
