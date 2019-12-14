import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { ConfigService } from '@/config/config.service';
import { HttpAdapterHost } from '@nestjs/core';
import { AuthService } from '../services/auth.service';

class ConfigServiceStub {
  clientUrl = '';
}

class HttpAdapterHostStub {
  httpAdapter = {
    get: (route: string, cb: any) => null,
  };
}

class AuthServiceStub {
  generateJwtToken(name: string, userId: string) { return ''; }
}

describe('Auth Controller', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: HttpAdapterHost, useClass: HttpAdapterHostStub },
        { provide: AuthService, useClass: AuthServiceStub },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
