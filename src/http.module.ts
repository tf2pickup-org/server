import { HttpModule as AxiosHttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AxiosHttpModule.register({
      headers: {
        'Accept-Encoding': 'gzip,deflate,compress', // https://github.com/axios/axios/issues/5346
      },
    }),
  ],
  exports: [AxiosHttpModule],
})
export class HttpModule {}
