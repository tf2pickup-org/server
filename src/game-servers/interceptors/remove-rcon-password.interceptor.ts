import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GameServer } from '../models/game-server';
import { DocumentType } from '@typegoose/typegoose';

function removeRconPassword(gameServer: GameServer) {
  const { rconPassword, ...ret } = gameServer;
  return ret;
}

@Injectable()
export class RemoveRconPasswordInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value: DocumentType<GameServer> | Array<DocumentType<GameServer>>) => {
        if (Array.isArray(value)) {
          return value.map(gs => removeRconPassword(gs.toJSON()));
        } else {
          return removeRconPassword(value.toJSON());
        }
      }),
    );
  }
}
