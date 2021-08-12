import { Environment } from '@/environment/environment';
import {
  logAddressAdd,
  logAddressDel,
  svLogsecret,
} from '@/games/utils/rcon-commands';
import { LogReceiverService } from '@/log-receiver/services/log-receiver.service';
import { Injectable, Scope } from '@nestjs/common';
import { generate } from 'generate-password';
import { Rcon } from 'rcon-client/lib';
import { DiagnosticCheckResult } from '../interfaces/diagnostic-check-result';
import { DiagnosticCheckRunner } from '../interfaces/diagnostic-check-runner';
import { generateLogsecret } from '../utils/generate-logsecret';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable({ scope: Scope.TRANSIENT })
export class LogForwarding implements DiagnosticCheckRunner {
  name = 'log forwarding';
  critical = true;

  constructor(
    private logReceiver: LogReceiverService,
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
      const logSecret = generateLogsecret();
      const secret = generate({ length: 32, numbers: true });
      const timer = setTimeout(
        () =>
          resolve({
            success: false,
            reportedErrors: [
              `No logs received over the UDP protocol on port ${this.environment.logRelayPort}. Check your firewall settings.`,
            ],
            reportedWarnings: [],
          }),
        5000,
      );

      const subscription = this.logReceiver.data.subscribe((data) => {
        if (
          data.password === logSecret &&
          new RegExp(`Console.+say\\s"${secret}"$`).test(data.payload)
        ) {
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
        .send(svLogsecret(logSecret))
        .then(() => rcon.send(logAddressAdd(logAddress)))
        .then(() => sleep(1000))
        .then(() => rcon.send(`say ${secret}`))
        .then(() => rcon.send(logAddressDel(logAddress)))
        .then(() => rcon.send(svLogsecret()))
        .then(() => subscription.unsubscribe());
    });
  }
}
