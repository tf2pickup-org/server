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
  let gameServerId: string;

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
      name: 'test game server',
      address: '192.168.1.12',
      port: '27015',
      rconPassword: '123456',
    });

    gameServerId = gameServer.id;
  });

  afterAll(async () => {
    const playerModel = app.get(getModelToken(Player.name)) as ReturnModelType<typeof Player>;
    await playerModel.deleteMany({ });

    const gameServerModel = app.get(getModelToken(GameServer.name)) as ReturnModelType<typeof GameServer>;
    await gameServerModel.deleteMany({ });

    await app.close();
  });

  describe('diagnostic run is requested', () => {
    let diagnosticRunId: string;

    const waitForDiagnosticRun = async (runId: string) => new Promise<void>(resolve => {
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
      });
    });

    afterEach(async () => {
      await waitForDiagnosticRun(diagnosticRunId);
    });

    it('POST /game-servers/:id/diagnostics', () => new Promise<void>((resolve, reject) => {
      request(app.getHttpServer())
        .post(`/game-servers/${gameServerId}/diagnostics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202)
        .expect('Content-Type', /json/)
        .end((error, response) => {
          if (error) {
            return reject(error);
          }

          expect(response.body.diagnosticRunId).toBeTruthy();
          expect(response.body.tracking.url).toBeTruthy();

          diagnosticRunId = response.body.diagnosticRunId;
          resolve();
        });
    }));
  });
});
