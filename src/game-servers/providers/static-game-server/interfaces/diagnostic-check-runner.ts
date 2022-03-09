import { StaticGameServer } from '../models/static-game-server';
import { DiagnosticCheckResult } from './diagnostic-check-result';

export interface DiagnosticCheckRunner {
  name: string;
  critical: boolean;

  run(params: {
    gameServer: StaticGameServer;
    effects: Map<string, any>;
  }): Promise<DiagnosticCheckResult>;
}
