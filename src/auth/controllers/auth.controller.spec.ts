import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Environment } from '@/environment/environment';
import { HttpAdapterHost } from '@nestjs/core';
import { AuthService } from '../services/auth.service';

class EnvironmentStub {
  clientUrl = '';
}

class HttpAdapterHostStub {
  httpAdapter = {
    get: (route: string, cb: any) => null,
  };
}

class AuthServiceStub {
  authToken = 'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVkNDQ4ODc1Yjk2M2ZmN2UwMGM2YjZiMyIsImlhdCI6MTU3Njc5NzQxNCwiZXhwIjoxNTc2Nzk4MzE0fQ.AXeWhEMSRS_kB7ISiRUt5vk9T71_mXUWevl_wT_tnyiS9vHQScMIY4qVzQnrx21FUwfyAmUVOdRdFNPpndGFPW4kARaPbeVkOSgF4vPt4MHJqvlXrA-B97Z7u9ahRqMFcdNyCIWbbR-bQ4592TJLdoGdx1Mqbc0brSYDlLaaG2aGPYN';
  refreshToken = 'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVkNDQ4ODc1Yjk2M2ZmN2UwMGM2YjZiMyIsImlhdCI6MTU3Njc5NzQxNCwiZXhwIjoxNTc3NDAyMjE0fQ.AAOwakFw8lKXRwmeLqPWksQTKjXqYVAb-Gc_sXhXolU36fPr69Flxgf5c2YZ6qCghZlloZ3TR5PaJ1PT3b2s1je5AfQw01fcZ56E10LGUyfLvV02Mgy5ler9PzbLi7sZzRs1QgDUeq3Ml9WYRIZirP_r9VxVS_4eDluP3NNlpFVqymDs';
  generateJwtToken(name: string, userId: string) { return ''; }
  refreshTokens(oldToken: string) {
    return {
      authToken: this.authToken,
      refreshToken: this.refreshToken,
    };
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

  describe('#refreshToken()', () => {
    it('should refresh both tokens and return them', async () => {
      const spy = spyOn(authService, 'refreshTokens').and.callThrough();
      const result = await controller.refreshToken('OLD_REFRESH_TOKEN');
      expect(spy).toHaveBeenCalledWith('OLD_REFRESH_TOKEN');
      expect(result).toEqual({
        authToken: authService.authToken,
        refreshToken: authService.refreshToken,
      });
    });

    it('should reject if the old refresh token is not present', async () => {
      await expectAsync(controller.refreshToken(undefined)).toBeRejectedWithError();
    });
  });

  describe('#refreshWsToken()', () => {
    it('should generate ws token', async () => {
      const spy = spyOn(authService, 'generateJwtToken').and.returnValue('FAKE_WS_TOKEN');
      const result = await controller.refreshWsToken({ id: 'FAKE_USER_ID' });
      expect(spy).toHaveBeenCalledWith('ws', 'FAKE_USER_ID');
      expect(result).toEqual({ wsToken: 'FAKE_WS_TOKEN' });
    });
  });
});
