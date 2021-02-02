import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import omitDeep = require('omit-deep-lodash');

@Injectable()
export class OmitDeepInterceptor implements NestInterceptor {

  constructor(
    private reflector: Reflector,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const props = this.reflector.get<string[]>('omit-deep', context.getHandler());
    return next.handle().pipe(
      map(data => props?.length > 0 ? omitDeep(data, props) : data),
    );
  }

}
