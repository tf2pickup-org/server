import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, Observable, of, switchMap } from 'rxjs';
import { Serializable } from '../serializable';

@Injectable()
export class SerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      switchMap((response) => {
        if (typeof response !== 'object' || response === null) {
          return of(response);
        } else {
          return from(this.serialize(response));
        }
      }),
    );
  }

  private async serialize(object: any): Promise<Record<string, any>> {
    if (object instanceof Serializable) {
      return await object.serialize();
    } else {
      return object;
    }
  }
}
