import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { MapVoteService } from '../services/map-vote.service';
import { OnModuleInit, UseFilters, UseGuards } from '@nestjs/common';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Events } from '@/events/events';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { WebsocketEvent } from '@/websocket-event';
import { AllExceptionsFilter } from '@/shared/filters/all-exceptions.filter';
import { serialize } from '@/shared/serialize';
import { Serializable } from '@/shared/serializable';
import { QueueSlotDto } from '../dto/queue-slot.dto';
import { QueueSlotWrapper } from '../controllers/queue-slot-wrapper';
import { CanJoinQueueGuard } from '../guards/can-join-queue.guard';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';
import { z } from 'zod';
import { ZodPipe } from '@/shared/pipes/zod.pipe';

const joinQueueSchema = z.object({
  slotId: z.number(),
});

const markFriendSchema = z.object({
  friendPlayerId: z.nullable(
    z
      .string()
      .refine((val) => Types.ObjectId.isValid(val), {
        message: 'id has to be a valid player id',
      })
      .transform((val) => new Types.ObjectId(val) as PlayerId),
  ),
});

const voteForMapSchema = z.object({
  map: z.string(),
});

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit, OnModuleInit {
  private socket!: Socket;

  constructor(
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private queueAnnouncementsService: QueueAnnouncementsService,
    private friendsService: FriendsService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.events.queueSlotsChange
      .pipe(
        distinctUntilChanged(),
        map(({ slots }) => slots.map((s) => new QueueSlotWrapper(s))),
      )
      .subscribe(async (slots) =>
        this.socket.emit(
          WebsocketEvent.queueSlotsUpdate,
          await serialize(slots),
        ),
      );
    this.events.queueStateChange
      .pipe(distinctUntilChanged())
      .subscribe(({ state }) =>
        this.socket.emit(WebsocketEvent.queueStateUpdate, state),
      );
    this.events.queueFriendshipsChange
      .pipe(distinctUntilChanged())
      .subscribe(({ friendships }) =>
        this.socket.emit(WebsocketEvent.friendshipsUpdate, friendships),
      );
    this.events.mapVotesChange
      .pipe(distinctUntilChanged())
      .subscribe(({ results }) =>
        this.socket.emit(WebsocketEvent.mapVoteResultsUpdate, results),
      );
    this.events.substituteRequestsChange.subscribe(async () => {
      const requests =
        await this.queueAnnouncementsService.substituteRequests();
      this.socket.emit(WebsocketEvent.substituteRequestsUpdate, requests);
    });
  }

  @UseFilters(AllExceptionsFilter)
  @UseGuards(CanJoinQueueGuard)
  @SubscribeMessage('join queue')
  joinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ZodPipe(joinQueueSchema))
    { slotId }: z.infer<typeof joinQueueSchema>,
  ): Serializable<QueueSlotDto>[] {
    return this.queueService
      .join(slotId, client.user._id)
      .map((s) => new QueueSlotWrapper(s));
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('leave queue')
  leaveQueue(@ConnectedSocket() client: Socket): Serializable<QueueSlotDto> {
    return new QueueSlotWrapper(this.queueService.leave(client.user._id));
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('player ready')
  playerReady(@ConnectedSocket() client: Socket): Serializable<QueueSlotDto> {
    return new QueueSlotWrapper(this.queueService.readyUp(client.user._id));
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('mark friend')
  markFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ZodPipe(markFriendSchema))
    { friendPlayerId }: z.infer<typeof markFriendSchema>,
  ) {
    return this.friendsService.markFriend(client.user._id, friendPlayerId);
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('vote for map')
  voteForMap(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ZodPipe(voteForMapSchema))
    { map }: z.infer<typeof voteForMapSchema>,
  ) {
    this.mapVoteService.voteForMap(client.user._id, map);
    return map;
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }
}
