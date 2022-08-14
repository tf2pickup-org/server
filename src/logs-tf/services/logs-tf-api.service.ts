import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LogsTfUploadError } from '../errors/logs-tf-upload.error';
import * as FormData from 'form-data';

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
    const data = new FormData();
    data.append('title', title);
    data.append('map', mapName);
    data.append('key', this.environment.logsTfApiKey);
    data.append('uploader', this.environment.websiteName);
    data.append('logfile', Buffer.from(logFile, 'utf-8'));

    return await lastValueFrom(
      this.httpService
        .post<UploadLogsResponse>(logsTfUploadEndpoint, data, {
          headers: data.getHeaders(),
          maxContentLength: 5 * 1000 * 1000, // 5 MB
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
