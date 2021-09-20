/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { GameServerDiagnosticsService } from '@/game-servers/services/game-server-diagnostics.service';
import { DiagnosticRunStatus } from '@/game-servers/models/diagnostic-run-status';
import { players, gameServer } from './test-data';

describe('Game server diagnostics (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let diagnosticsService: GameServerDiagnosticsService;

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

  beforeAll(() => jest.setTimeout(10000));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    diagnosticsService = app.get(GameServerDiagnosticsService);
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
