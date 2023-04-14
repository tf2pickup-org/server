import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Environment } from '@/environment/environment';
import { HttpAdapterHost } from '@nestjs/core';
import { AuthService } from '../services/auth.service';
import { Player } from '@/players/models/player';
import { JwtTokenPurpose } from '../jwt-token-purpose';

class EnvironmentStub {
  clientUrl = '';
}

class HttpAdapterHostStub {
  httpAdapter = {
    get: (route: string, cb: any) => null,
  };
}

class AuthServiceStub {
  authToken =
    'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVkNDQ4ODc1Yjk2M2ZmN2UwMGM2YjZiMyIsImlhdCI6MTU3Njc5NzQxNCwiZXhwIjoxNTc2Nzk4MzE0fQ.AXeWhEMSRS_kB7ISiRUt5vk9T71_mXUWevl_wT_tnyiS9vHQScMIY4qVzQnrx21FUwfyAmUVOdRdFNPpndGFPW4kARaPbeVkOSgF4vPt4MHJqvlXrA-B97Z7u9ahRqMFcdNyCIWbbR-bQ4592TJLdoGdx1Mqbc0brSYDlLaaG2aGPYN';
  generateJwtToken(name: string, userId: string) {
    return '';
  }
}

describe('Auth Controller', () => {
  let controller: AuthController;
  let authService: AuthServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: Environment, useClass: EnvironmentStub },
        { provide: HttpAdapterHost, useClass: HttpAdapterHostStub },
        { provide: AuthService, useClass: AuthServiceStub },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#refreshWsToken()', () => {
    it('should generate ws token', async () => {
      const spy = jest
        .spyOn(authService, 'generateJwtToken')
        .mockImplementation(() => 'FAKE_WS_TOKEN');
      const result = await controller.refreshWsToken({
        id: 'FAKE_USER_ID',
      } as Player);
      expect(spy).toHaveBeenCalledWith(
        JwtTokenPurpose.websocket,
        'FAKE_USER_ID',
      );
      expect(result).toEqual({ wsToken: 'FAKE_WS_TOKEN' });
    });
  });
});
