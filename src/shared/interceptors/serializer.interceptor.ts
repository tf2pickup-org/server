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

  private async serialize(response: any): Promise<Record<string, any>> {
    if (response instanceof Serializable) {
      return await response.serialize();
    } else {
      return response;
    }

    // const serializedProps = await Promise.all(
    //   Object.keys(response).map(async (key) => {
    //     const value = response[key];

    //     if (!(value instanceof Serializable)) {
    //       return { key, value };
    //     } else {
    //       return {
    //         key,
    //         value: await value.serialize(),
    //       };
    //     }
    //   }),
    // );

    // return serializedProps.reduce((result, { key, value }) => {
    //   result[key] = value;
    //   return result;
    // }, {});
  }
}
