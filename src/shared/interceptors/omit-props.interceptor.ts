import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { omit } from 'lodash';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class OmitPropsInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const paths = this.reflector.get<string[]>(
      'omit-props',
      context.getHandler(),
    );
    return next.handle().pipe(map((obj) => omit(obj, paths)));
  }
}
