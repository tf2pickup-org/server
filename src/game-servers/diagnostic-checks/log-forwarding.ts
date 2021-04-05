import { Environment } from '@/environment/environment';
import { logAddressAdd, logAddressDel } from '@/games/utils/rcon-commands';
import { Injectable, Scope } from '@nestjs/common';
import { generate } from 'generate-password';
import { Rcon } from 'rcon-client/lib';
import { LogMessage, LogReceiver } from 'srcds-log-receiver';
import { DiagnosticCheckResult } from '../interfaces/diagnostic-check-result';
import { DiagnosticCheckRunner } from '../interfaces/diagnostic-check-runner';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable({ scope: Scope.TRANSIENT })
export class LogForwarding implements DiagnosticCheckRunner {
  name = 'log forwarding';
  critical = true;

  constructor(
    private logReceiver: LogReceiver,
    private environment: Environment,
  ) {}

  async run({ effects }): Promise<DiagnosticCheckResult> {
    const rcon: Rcon = effects.get('rcon connection');
    if (!rcon) {
      return Promise.resolve({
        success: false,
        reportedErrors: ['RCON not available'],
        reportedWarnings: [],
      });
    }

    return new Promise((resolve) => {
      const secret = generate({ length: 32, numbers: true });
      const timer = setTimeout(
        () =>
          resolve({
            success: false,
            reportedErrors: [
              `No logs received over the UDP protocol on port ${this.logReceiver.opts.port}. Check your firewall settings.`,
            ],
            reportedWarnings: [],
          }),
        5000,
      );

      this.logReceiver.on('data', (data: LogMessage) => {
        if (new RegExp(`Console.+say\\s"${secret}"$`).test(data.message)) {
          clearTimeout(timer);
          resolve({
            success: true,
            reportedErrors: [],
            reportedWarnings: [],
          });
        }
      });

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      rcon
        .send(logAddressAdd(logAddress))
        .then(() => sleep(1000))
        .then(() => rcon.send(`say ${secret}`))
        .then(() => rcon.send(logAddressDel(logAddress)));
    });
  }
}
