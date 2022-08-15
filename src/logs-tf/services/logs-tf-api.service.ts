import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { Injectable } from '@nestjs/common';
import { LogsTfUploadError } from '../errors/logs-tf-upload.error';
import * as FormData from 'form-data';
import { version } from '../../../package.json';

interface UploadLogsResponse {
  success: boolean;
  error?: string;
  log_id: string;
  url: string;
}

interface UploadLogsParams {
  mapName: string;
  gameNumber: number;
  logFile: string;
  title?: string;
}

@Injectable()
export class LogsTfApiService {
  constructor(private readonly environment: Environment) {}

  public async uploadLogs(params: UploadLogsParams): Promise<string> {
    const data = new FormData();
    const title =
      params.title ?? `${this.environment.websiteName} #${params.gameNumber}`;
    data.append('title', title);
    data.append('map', params.mapName);
    data.append('key', this.environment.logsTfApiKey);
    data.append('uploader', `${this.environment.websiteName} ${version}`);
    data.append(
      'logfile',
      Buffer.from(params.logFile, 'utf-8'),
      `${params.gameNumber}.log`,
    );

    // we're not using axios here because of this issue:
    // https://github.com/axios/axios/issues/4806

    return new Promise((resolve, reject) => {
      data.submit(logsTfUploadEndpoint, (error, response) => {
        if (error) {
          reject(new LogsTfUploadError(error.message));
          return;
        }

        let reply = '';
        response.on('data', (chunk) => (reply += chunk));
        response.on('end', () => {
          const d = JSON.parse(reply) as UploadLogsResponse;
          if (!d.success) {
            reject(new LogsTfUploadError(d.error));
          } else {
            resolve(`https://logs.tf${d.url}`);
          }
        });
        response.on('error', (error) =>
          reject(new LogsTfUploadError(error.message)),
        );

        response.resume();
      });
    });
  }
}
