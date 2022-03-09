/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { GameServerDiagnosticsService } from '@/game-servers/providers/static-game-server/services/game-server-diagnostics.service';
import { DiagnosticRunStatus } from '@/game-servers/providers/static-game-server/models/diagnostic-run-status';
import { players } from './test-data';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';

jest.setTimeout(70000);

describe('Game server diagnostics (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let diagnosticsService: GameServerDiagnosticsService;
  let staticGameServersService: StaticGameServersService;
  let gameServer: string;

  const waitForDiagnosticRunToComplete = async (runId: string) =>
    new Promise<void>((resolve) => {
      const isDone = async () => {
        const run = await diagnosticsService.getDiagnosticRunById(runId);
        return [
          DiagnosticRunStatus.completed,
          DiagnosticRunStatus.failed,
        ].includes(run.status);
      };

      const i = setInterval(async () => {
        if (await isDone()) {
          clearInterval(i);
          resolve();
        }
      }, 1000);
    });

  const waitForGameServerToComeOnline = async () =>
    new Promise<string>((resolve) => {
      const i = setInterval(async () => {
        const gameServers = await staticGameServersService.getAllGameServers();
        if (gameServers.length > 0) {
          clearInterval(i);
          resolve(gameServers[0].id);
        }
      }, 1000);
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);

    diagnosticsService = app.get(GameServerDiagnosticsService);
    staticGameServersService = app.get(StaticGameServersService);

    gameServer = await waitForGameServerToComeOnline();
  });

  beforeAll(async () => {
    const playersService = app.get(PlayersService);
    const player = await playersService.findBySteamId(players[0]);

    const authService = app.get(AuthService);
    authToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      player.id,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('diagnostic run for a working game server', () => {
    let diagnosticRunId: string;

    beforeEach(async () => {
      diagnosticRunId = await diagnosticsService.runDiagnostics(gameServer);
    });

    afterEach(async () => {
      await waitForDiagnosticRunToComplete(diagnosticRunId);
    });

    it('GET /game-server-diagnostics/:id', async () => {
      await waitForDiagnosticRunToComplete(diagnosticRunId);

      return request(app.getHttpServer())
        .get(`/game-server-diagnostics/${diagnosticRunId}`)
        .auth(authToken, { type: 'bearer' })
        .expect(200)
        .then((response) => {
          const body = response.body;
          expect(body.id).toEqual(diagnosticRunId);
          expect(body.gameServer).toEqual(gameServer);
          expect(body.status).toEqual('completed');
          expect(
            body.checks.every((check) => check.status === 'completed'),
          ).toBe(true);
        });
    });
  });
});
