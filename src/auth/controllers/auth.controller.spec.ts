import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Environment } from '@/environment/environment';
import { HttpAdapterHost } from '@nestjs/core';
import { AuthService } from '../services/auth.service';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import { Player } from '@/players/models/player';

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
      const spy = jest.spyOn(authService, 'refreshTokens');
      const result = await controller.refreshToken('OLD_REFRESH_TOKEN');
      expect(spy).toHaveBeenCalledWith('OLD_REFRESH_TOKEN');
      expect(result).toEqual({
        authToken: authService.authToken,
        refreshToken: authService.refreshToken,
      });
    });

    it('should reject if the old refresh token is not present', async () => {
      await expect(controller.refreshToken(undefined)).rejects.toThrow(BadRequestException);
    });

    it('should be rejected if the token is invalid', async () => {
      jest.spyOn(authService, 'refreshTokens').mockRejectedValue('invalid token' as never);
      await expect(controller.refreshToken('OLD_REFRESH_TOKEN')).rejects.toThrow(BadRequestException)
    });
  });

  describe('#refreshWsToken()', () => {
    it('should generate ws token', async () => {
      const spy = jest.spyOn(authService, 'generateJwtToken').mockImplementation(() => 'FAKE_WS_TOKEN');
      const result = await controller.refreshWsToken({ _id: 'FAKE_USER_ID' } as Player);
      expect(spy).toHaveBeenCalledWith('ws', 'FAKE_USER_ID');
      expect(result).toEqual({ wsToken: 'FAKE_WS_TOKEN' });
    });
  });
});
