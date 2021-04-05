import { GameServer } from '../models/game-server';
import { DiagnosticCheckResult } from './diagnostic-check-result';

export interface DiagnosticCheckRunner {
  name: string;
  critical: boolean;

  run(params: {
    gameServer: GameServer;
    effects: Map<string, any>;
  }): Promise<DiagnosticCheckResult>;
}
