import { Environment } from '@/environment/environment';
import { logsTfUploadEndpoint } from '@configs/urls';
import { Injectable } from '@nestjs/common';
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
  constructor(private readonly environment: Environment) {}

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
