import { Injectable, Scope } from '@nestjs/common';
import { query } from 'gamedig';
import { DiagnosticCheckResult } from '../interfaces/diagnostic-check-result';
import { DiagnosticCheckRunner } from '../interfaces/diagnostic-check-runner';

@Injectable({ scope: Scope.TRANSIENT })
export class ServerDiscovery implements DiagnosticCheckRunner {
  name = 'server discovery';
  critical = false;

  async run({ gameServer }): Promise<DiagnosticCheckResult> {
    try {
      const result = await query({
        type: 'tf2',
        host: gameServer.address,
        port: parseInt(gameServer.port, 10),
      });
      const reportedWarnings = [];

      if (!result.password) {
        reportedWarnings.push('The server is not password-protected.');
      }

      return {
        success: true,
        reportedErrors: [],
        reportedWarnings,
      };
    } catch (error) {
      return {
        success: false,
        reportedErrors: [error.toString()],
        reportedWarnings: [],
      };
    }
  }
}
