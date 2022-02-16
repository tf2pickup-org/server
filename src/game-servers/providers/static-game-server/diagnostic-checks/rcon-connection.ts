import { Injectable, Scope } from '@nestjs/common';
import { Rcon } from 'rcon-client/lib';
import { DiagnosticCheckResult } from '../interfaces/diagnostic-check-result';
import { DiagnosticCheckRunner } from '../interfaces/diagnostic-check-runner';

@Injectable({ scope: Scope.TRANSIENT })
export class RconConnection implements DiagnosticCheckRunner {
  name = 'rcon connection';
  critical = true;

  async run({ gameServer }): Promise<DiagnosticCheckResult> {
    const createRcon = () =>
      new Promise((resolve, reject) => {
        const rcon = new Rcon({
          host: gameServer.internalIpAddress,
          port: parseInt(gameServer.port, 10),
          password: gameServer.rconPassword,
          timeout: 30000,
        });

        rcon.on('authenticated', () => resolve(rcon));
        rcon.on('error', () => reject());

        return rcon.connect().catch(reject);
      });

    try {
      const rcon = await createRcon();
      return {
        success: true,
        reportedErrors: [],
        reportedWarnings: [],
        effects: new Map([['rcon connection', rcon]]),
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
