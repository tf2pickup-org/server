import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, Observable, switchMap } from 'rxjs';
import { Serializable } from '../serializable';

@Injectable()
export class SerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(switchMap((response) => from(this.serialize(response))));
  }

  private async serialize(object: any): Promise<Record<string, any>> {
    if (typeof object !== 'object' || object === null) {
      return object;
    }

    if (object instanceof Serializable) {
      const s = await object.serialize();
      for (const key in s) {
        s[key] = await this.serialize(s[key]);
      }

      return s;
    }

    if (Array.isArray(object)) {
      return await Promise.all(
        object.map(async (element) => await this.serialize(element)),
      );
    }

    await Promise.all(
      Object.keys(object).map(
        async (key) => (object[key] = await this.serialize(object[key])),
      ),
    );

    return object;
  }
}
