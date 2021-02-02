import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface UnderscoreIdObject {
  _id?: string;
}

interface IdObject {
  id?: string;
}

const setId = <T extends UnderscoreIdObject>(input: T): T & IdObject => {
  if (input._id) {
    return { id: input._id.toString(), ...input };
  } else {
    return input;
  }
}

@Injectable()
export class UnderscoreIdToIdInterceptor implements NestInterceptor {

  intercept(context: ExecutionContext, next: CallHandler): Observable<IdObject | IdObject[]> {
    return next.handle().pipe(
      map((data: UnderscoreIdObject | UnderscoreIdObject[]) => {
        if (Array.isArray(data)) {
          return data.map(setId);
        } else {
          return setId(data);
        }
      }),
    );
  }

}
