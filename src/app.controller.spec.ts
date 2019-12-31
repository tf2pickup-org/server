import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { Environment } from './environment/environment';

class EnvironmentStub {
  clientUrl = 'FAKE_CLIENT_URL';
  apiUrl = 'FAKE_API_URL';
}

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: Environment, useClass: EnvironmentStub },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('#index()', () => {
    it('should return api index', () => {
      expect(appController.index()).toEqual({
        version: jasmine.any(String),
        clientUrl: 'FAKE_CLIENT_URL',
        loginUrl: 'FAKE_API_URL/auth/steam',
      });
    });
  });
});
