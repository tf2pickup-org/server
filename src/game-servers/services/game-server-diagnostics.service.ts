import { Injectable } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { plainToClass } from 'class-transformer';
import { InjectModel } from 'nestjs-typegoose';
import { from, noop, Observable } from 'rxjs';
import { GameServerDiagnosticRunner } from '../game-server-diagnostic-runner';
import { GameServerDiagnosticRun } from '../models/game-server-diagnostic-run';
import { GameServersService } from './game-servers.service';

@Injectable()
export class GameServerDiagnosticsService {

  private runners = new Map<string, GameServerDiagnosticRunner>();

  constructor(
    @InjectModel(GameServerDiagnosticRun) private gameServerDiagnosticRunModel: ReturnModelType<typeof GameServerDiagnosticRun>,
    private gameServersService: GameServersService,
  ) { }

  async getDiagnosticRunById(id: string): Promise<GameServerDiagnosticRun> {
    return plainToClass(GameServerDiagnosticRun, await this.gameServerDiagnosticRunModel.findById(id).orFail().lean().exec());
  }

  getDiagnosticRunObservable(id: string): Observable<GameServerDiagnosticRun> {
    return this.runners.get(id)?.run ?? from(this.getDiagnosticRunById(id));
  }

  async runDiagnostics(gameServerId: string): Promise<string> {
    const gameServer = await this.gameServersService.getById(gameServerId);
    const { id } = await this.gameServerDiagnosticRunModel.create({
      gameServer: gameServerId,
      checks: [
        {
          name: 'discovery',
          critical: false,
        },
      ],
    });

    const run = await this.getDiagnosticRunById(id);
    const runner = new GameServerDiagnosticRunner(run, gameServer);
    runner.run.subscribe(
      run => this.gameServerDiagnosticRunModel.updateOne({ _id: run.id }, run).orFail().lean().exec(),
      noop,
      () => this.runners.delete(id),
    );
    this.runners.set(id, runner);
    return id;
  }

}
