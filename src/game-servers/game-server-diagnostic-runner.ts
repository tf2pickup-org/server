import { Logger } from '@nestjs/common';
import { classToClass } from 'class-transformer';
import { query } from 'gamedig';
import { Rcon } from 'rcon-client/lib';
import { BehaviorSubject } from 'rxjs';
import { rconConnection } from './diagnostic-checks/rcon-connection';
import { DiagnosticCheckStatus } from './models/diagnostic-check-status';
import { DiagnosticRunStatus } from './models/diagnostic-run-status';
import { GameServer } from './models/game-server';
import { GameServerDiagnosticRun } from './models/game-server-diagnostic-run';

export class GameServerDiagnosticRunner {

  get run() {
    return this._run.asObservable();
  }

  private logger: Logger;
  private _run: BehaviorSubject<GameServerDiagnosticRun>;
  private rcon: Rcon;

  constructor(
    run: GameServerDiagnosticRun,
    private gameServer: GameServer,
  ) {
    this.logger = new Logger(`${GameServerDiagnosticRunner.name}/${gameServer.name}`);
    this._run = new BehaviorSubject(run);

    this.start()
      .then(() => this.checkDiscovery())
      .then(() => this.checkRconConnection())
      .then(() => this.complete());
  }

  async start() {
    const updatedRun = classToClass(this._run.value);
    updatedRun.status = DiagnosticRunStatus.running;
    this._run.next(updatedRun);
    return updatedRun;
  }

  async checkDiscovery() {
    const run1 = classToClass(this._run.value);
    let check = run1.getCheckByName('discovery');
    if (!check) {
      return run1;
    }

    this.logger.log('checking server discovery...');
    check.status = DiagnosticCheckStatus.running;
    this._run.next(run1);

    const run2 = classToClass(run1);
    check = run2.getCheckByName('discovery');

    try {
      const result = await query({ type: 'tf2', host: this.gameServer.address, port: parseInt(this.gameServer.port, 10) });
      check.status = DiagnosticCheckStatus.completed;

      if (!result.password) {
        check.reportedWarnings.push('The server is not password-protected.');
      }

      this.logger.log('success');
    } catch (error) {
      check.status = DiagnosticCheckStatus.failed;
      check.reportedErrors.push(error.toString());
      this.logger.warn(`failed: ${error}`);
    }

    this._run.next(run2);
    return run2;
  }

  async checkRconConnection() {
    const run1 = classToClass(this._run.value);
    let check = run1.getCheckByName('rcon connection');
    if (!check) {
      return run1;
    }

    this.logger.log('checking rcon connection...');
    check.status = DiagnosticCheckStatus.running;
    this._run.next(run1);

    const run2 = classToClass(run1);
    check = run2.getCheckByName('rcon connection');

    try {
      this.rcon = await rconConnection(this.gameServer);
      const status = await this.rcon.send('status');

      if (!new RegExp(/Loaded\splugins.+TFTrue/, 's').test(status)) {
        check.reportedWarnings.push('TFTrue is not installed');
      }

      this.logger.debug(status);
      check.status = DiagnosticCheckStatus.completed;
      this.logger.log('success');
    } catch (error) {
      check.status = DiagnosticCheckStatus.failed;
      check.reportedErrors.push(error.toString());
      this.logger.warn(`failed: ${error}`);
    }

    this._run.next(run2);
    return run2;
  }

  complete() {
    const updatedRun = classToClass(this._run.value);
    updatedRun.status = updatedRun.checks.every(check => check.status === DiagnosticCheckStatus.completed) ?
      DiagnosticRunStatus.completed : DiagnosticRunStatus.failed;

    this._run.next(updatedRun);
    this._run.complete();
  }

}
