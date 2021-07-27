import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { classToClass, plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import { from, Observable } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { LogForwarding } from '../diagnostic-checks/log-forwarding';
import { RconConnection } from '../diagnostic-checks/rcon-connection';
import { ServerDiscovery } from '../diagnostic-checks/server-discovery';
import { DiagnosticCheckRunner } from '../interfaces/diagnostic-check-runner';
import { DiagnosticCheckStatus } from '../models/diagnostic-check-status';
import { DiagnosticRunStatus } from '../models/diagnostic-run-status';
import {
  GameServerDiagnosticRun,
  GameServerDiagnosticRunDocument,
} from '../models/game-server-diagnostic-run';
import { GameServersService } from './game-servers.service';

@Injectable()
export class GameServerDiagnosticsService {
  private logger = new Logger(GameServerDiagnosticsService.name);

  constructor(
    @InjectModel(GameServerDiagnosticRun.name)
    private gameServerDiagnosticRunModel: Model<GameServerDiagnosticRunDocument>,
    private gameServersService: GameServersService,
    private moduleRef: ModuleRef,
  ) {}

  async getDiagnosticRunById(id: string): Promise<GameServerDiagnosticRun> {
    return plainToClass(
      GameServerDiagnosticRun,
      await this.gameServerDiagnosticRunModel
        .findById(id)
        .orFail()
        .lean()
        .exec(),
    );
  }

  async runDiagnostics(gameServerId: string): Promise<string> {
    await this.gameServersService.getById(gameServerId);
    const runners = await this.collectAllRunners();
    const checks = runners.map((runner) => ({
      name: runner.name,
      critical: runner.critical,
    }));

    const { id } = await this.gameServerDiagnosticRunModel.create({
      gameServer: gameServerId,
      checks,
    });

    const run$ = this.executeAllRunners(
      await this.getDiagnosticRunById(id),
      runners,
    );
    run$
      .pipe(
        tap((run) => this.logger.debug(JSON.stringify(run, null, 2))),
        concatMap((run) =>
          from(
            this.gameServerDiagnosticRunModel
              .findOneAndUpdate({ _id: run.id }, run)
              .orFail()
              .lean()
              .exec(),
          ),
        ),
      )
      .subscribe();

    return id;
  }

  async collectAllRunners(): Promise<DiagnosticCheckRunner[]> {
    return Promise.all([
      this.moduleRef.resolve(ServerDiscovery),
      this.moduleRef.resolve(RconConnection),
      this.moduleRef.resolve(LogForwarding),
    ]);
  }

  private executeAllRunners(
    diagnosticRun: GameServerDiagnosticRun,
    runners: DiagnosticCheckRunner[],
  ): Observable<GameServerDiagnosticRun> {
    return new Observable<GameServerDiagnosticRun>((subscriber) => {
      let shouldStop = false;

      const fn = async () => {
        const gameServer = await this.gameServersService.getById(
          diagnosticRun.gameServer.toString(),
        );

        this.logger.log(`Starting diagnostics of ${gameServer.name}...`);

        const effects = new Map<string, any>();
        let run = classToClass(diagnosticRun);
        run.status = DiagnosticRunStatus.running;

        for (const runner of runners) {
          if (shouldStop) {
            break;
          }

          run = classToClass(run);
          let check = run.getCheckByName(runner.name);
          check.status = DiagnosticCheckStatus.running;
          subscriber.next(run);

          run = classToClass(run);
          check = run.getCheckByName(runner.name);

          const result = await runner.run({ gameServer, effects });
          check.reportedErrors = result.reportedErrors;
          check.reportedWarnings = result.reportedWarnings;
          check.status = result.success
            ? DiagnosticCheckStatus.completed
            : DiagnosticCheckStatus.failed;
          subscriber.next(run);

          if (result.effects) {
            result.effects.forEach((value, key) => effects.set(key, value));
          }
        }

        run = classToClass(run);
        run.status = run.checks.every(
          (check) => check.status === DiagnosticCheckStatus.completed,
        )
          ? DiagnosticRunStatus.completed
          : DiagnosticRunStatus.failed;
        subscriber.next(run);

        this.logger.log(
          `Diagnostics of ${gameServer.name} done. Status: ${run.status}`,
        );
        subscriber.complete();
      };

      fn();
      return () => (shouldStop = true);
    });
  }
}
