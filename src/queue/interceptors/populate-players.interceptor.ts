import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { QueueSlot } from '../queue-slot';
import { PlayerPopulatorService } from '../services/player-populator.service';

@Injectable()
export class PopulatePlayersInterceptor implements NestInterceptor {
  constructor(private playerPopulatorService: PlayerPopulatorService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      switchMap((data: QueueSlot | QueueSlot[]) => {
        if (Array.isArray(data)) {
          return from(this.playerPopulatorService.populatePlayers(data));
        } else {
          return from(this.playerPopulatorService.populatePlayer(data));
        }
      }),
    );
  }
}
