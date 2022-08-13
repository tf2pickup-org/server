import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
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
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogsTfApiService, HttpService, Environment],
    }).compile();

    service = module.get<LogsTfApiService>(LogsTfApiService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#uploadLogs()', () => {
    describe('when the upload is successful', () => {
      beforeEach(() => {
        httpService.post.mockReturnValueOnce(
          of({
            data: {
              url: '/420',
              success: true,
            },
            status: 200,
          } as any),
        );
      });

      it('should return uploaded log url', async () => {
        const response = await service.uploadLogs(
          'cp_badlands',
          'FAKE_TITLE',
          'LOG_LINE_1\nLOG_LINE_2',
        );
        expect(httpService.post).toHaveBeenCalledWith(logsTfUploadEndpoint, {
          title: 'FAKE_TITLE',
          map: 'cp_badlands',
          key: 'FAKE_LOGS_TF_API_KEY',
          logfile: 'LOG_LINE_1\nLOG_LINE_2',
          uploader: 'FAKE_WEBSITE_NAME',
        });
        expect(response).toEqual('https://logs.tf/420');
      });
    });

    describe('when the upload has failed', () => {
      beforeEach(() => {
        httpService.post.mockReturnValueOnce(
          throwError(() => ({
            response: {
              data: {
                success: false,
                error: 'SOME_FAKE_ERROR',
              },
              status: 200,
            },
          })),
        );
      });

      it('should return uploaded log url', async () => {
        await expect(
          service.uploadLogs(
            'cp_badlands',
            'FAKE_TITLE',
            'LOG_LINE_1\nLOG_LINE_2',
          ),
        ).rejects.toThrowError('SOME_FAKE_ERROR');
      });
    });
  });
});
