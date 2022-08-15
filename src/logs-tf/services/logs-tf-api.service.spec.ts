import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import * as FormData from 'form-data';
import { of, throwError } from 'rxjs';
import { LogsTfApiService } from './logs-tf-api.service';

jest.mock('@nestjs/axios');
jest.mock('@/environment/environment', () => ({
  Environment: jest.fn().mockImplementation(() => ({
    logsTfApiKey: 'FAKE_LOGS_TF_API_KEY',
    websiteName: 'FAKE_WEBSITE_NAME',
  })),
}));

describe('LogsTfApiService', () => {
  let service: LogsTfApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogsTfApiService, HttpService, Environment],
    }).compile();

    service = module.get<LogsTfApiService>(LogsTfApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#uploadLogs()', () => {
    // TODO write tests
  });
});
