/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GameServerDiagnosticsService } from '@/game-servers/services/game-server-diagnostics.service';
import { DiagnosticRunStatus } from '@/game-servers/models/diagnostic-run-status';
import { getModelToken } from 'nestjs-typegoose';
import { Player } from '@/players/models/player';
import { ReturnModelType } from '@typegoose/typegoose';
import { GameServer } from '@/game-servers/models/game-server';

jest.mock('@/players/services/steam-api.service');
jest.setTimeout(10000);

describe('Game server diagnostics (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let workingGameServerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ AppModule ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeAll(async () => {
    const playersService = app.get(PlayersService);
    const maly = await playersService.createPlayer((await import('./steam-profiles')).maly);

    const authService = app.get(AuthService);
    authToken = await authService.generateJwtToken(JwtTokenPurpose.auth, maly.id);

    const gameServersService = app.get(GameServersService);
    const gameServer = await gameServersService.addGameServer({
      name: 'working game server',
      address: 'localhost',
      port: '27015',
      rconPassword: '123456',
    });

    workingGameServerId = gameServer.id;
  });

  afterAll(async () => {
    const playerModel = app.get(getModelToken(Player.name)) as ReturnModelType<typeof Player>;
    await playerModel.deleteMany({ });

    const gameServerModel = app.get(getModelToken(GameServer.name)) as ReturnModelType<typeof GameServer>;
    await gameServerModel.deleteMany({ });

    await app.close();
  });

  describe('diagnostic run', () => {
    let diagnosticRunId: string;

    const waitForDiagnosticRunToComplete = async (runId: string) => new Promise<void>(resolve => {
      const isDone = async () => {
        const diagnosticsService = app.get(GameServerDiagnosticsService);
        const run = await diagnosticsService.getDiagnosticRunById(runId);
        return [DiagnosticRunStatus.completed, DiagnosticRunStatus.failed].includes(run.status);
      };

      const i = setInterval(async () => {
        if (await isDone()) {
          clearInterval(i);
          resolve();
        }
      }, 1000);
    });

    beforeEach(async () => {
      const diagnosticsService = app.get(GameServerDiagnosticsService);
      diagnosticRunId = await diagnosticsService.runDiagnostics(workingGameServerId);
    });

    afterEach(async () => {
      await waitForDiagnosticRunToComplete(diagnosticRunId);
    });

    it('GET /game-server-diagnostics/:id', async () => {
      await waitForDiagnosticRunToComplete(diagnosticRunId);

      return request(app.getHttpServer())
        .get(`/game-server-diagnostics/${diagnosticRunId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then(response => {
          const body = response.body;
          expect(body.id).toEqual(diagnosticRunId);
          expect(body.gameServer).toEqual(workingGameServerId);
          expect(body.status).toEqual('completed');
          expect(body.checks.every(check => check.status === 'completed')).toBe(true);
        });
    });
  });
});
