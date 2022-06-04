import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
} from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { MapVoteService } from '../services/map-vote.service';
import { OnModuleInit, UseFilters } from '@nestjs/common';
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

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit, OnModuleInit {
  private socket: Socket;

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
  @WsAuthorized()
  @SubscribeMessage('join queue')
  async joinQueue(
    client: Socket,
    payload: { slotId: number },
  ): Promise<Serializable<QueueSlotDto>[]> {
    return (await this.queueService.join(payload.slotId, client.user.id)).map(
      (s) => new QueueSlotWrapper(s),
    );
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('leave queue')
  leaveQueue(client: Socket): Serializable<QueueSlotDto> {
    return new QueueSlotWrapper(this.queueService.leave(client.user.id));
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('player ready')
  playerReady(client: Socket): Serializable<QueueSlotDto> {
    return new QueueSlotWrapper(this.queueService.readyUp(client.user.id));
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('mark friend')
  markFriend(client: Socket, payload: { friendPlayerId: string }) {
    return this.friendsService.markFriend(
      client.user.id,
      payload.friendPlayerId,
    );
  }

  @UseFilters(AllExceptionsFilter)
  @WsAuthorized()
  @SubscribeMessage('vote for map')
  voteForMap(client: Socket, payload: { map: string }) {
    this.mapVoteService.voteForMap(client.user.id, payload.map);
    return payload.map;
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }
}
