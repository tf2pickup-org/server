import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LogsTfUploadError } from '../errors/logs-tf-upload.error';

interface UploadLogsResponse {
  success: boolean;
  error?: string;
  log_id: string;
  url: string;
}

@Injectable()
export class LogsTfApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly environment: Environment,
  ) {}

  public async uploadLogs(
    mapName: string,
    title: string,
    logFile: string,
  ): Promise<string> {
    return await lastValueFrom(
      this.httpService
        .post<UploadLogsResponse>(logsTfUploadEndpoint, {
          title,
          map: mapName,
          key: this.environment.logsTfApiKey,
          logfile: logFile,
          uploader: this.environment.websiteName,
        })
        .pipe(
          map((response) => response.data),
          switchMap((data) => {
            if (data.success) {
              return of(`https://logs.tf${data.url}`);
            } else {
              throw new LogsTfUploadError(data.error);
            }
          }),
          catchError((error) => {
            if (error.response?.data?.error) {
              throw new LogsTfUploadError(error.response.data.error);
            } else {
              throw new LogsTfUploadError(error);
            }
          }),
        ),
    );
  }
}
