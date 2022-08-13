import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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
              return throwError(() => data.error ?? 'unknown error');
            }
          }),
        ),
    );
  }
}
