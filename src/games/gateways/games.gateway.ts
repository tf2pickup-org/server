import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { PlayerSubstitutionService } from '../services/player-substitution.service';
import {
  Inject,
  forwardRef,
  OnModuleInit,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { Events } from '@/events/events';
import { WebsocketEvent } from '@/websocket-event';
import { SerializerInterceptor } from '@/shared/interceptors/serializer.interceptor';
import { Serializable } from '@/shared/serializable';
import { GameDto } from '../dto/game.dto';
import { WebsocketEventEmitter } from '@/shared/websocket-event-emitter';
import { Types } from 'mongoose';
import { GameId } from '../game-id';
import { PlayerId } from '@/players/types/player-id';
import { CanReplacePlayerGuard } from '../guards/can-replace-player.guard';
import { z } from 'zod';
import { ZodPipe } from '@/shared/pipes/zod.pipe';

const replacePlayerSchema = z.object({
  gameId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), {
      message: 'id has to be a valid game id',
    })
    .transform((val) => new Types.ObjectId(val) as GameId),
  replaceeId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), {
      message: 'id has to be a valid player id',
    })
    .transform((val) => new Types.ObjectId(val) as PlayerId),
});

@WebSocketGateway()
export class GamesGateway
  extends WebsocketEventEmitter<GameDto>
  implements OnModuleInit
{
  constructor(
    @Inject(forwardRef(() => PlayerSubstitutionService))
    private playerSubstitutionService: PlayerSubstitutionService,
    private events: Events,
  ) {
    super();
  }

  @WsAuthorized()
  @UseGuards(CanReplacePlayerGuard)
  @SubscribeMessage('replace player')
  @UseInterceptors(SerializerInterceptor)
  async replacePlayer(
    @ConnectedSocket()
    client: Socket,
    @MessageBody(new ZodPipe(replacePlayerSchema))
    { gameId, replaceeId }: z.infer<typeof replacePlayerSchema>,
  ): Promise<Serializable<GameDto>> {
    return await this.playerSubstitutionService.replacePlayer(
      gameId,
      replaceeId,
      client.user._id,
    );
  }

  onModuleInit() {
    this.events.gameCreated.subscribe(async ({ game }) => {
      await this.emit({
        event: WebsocketEvent.gameCreated,
        payload: game,
      });
    });

    // TODO v12: filter public game data changes only
    this.events.gameChanges.subscribe(async ({ newGame }) => {
      await this.emit({
        event: WebsocketEvent.gameUpdated,
        payload: newGame,
      });
    });
  }
}
