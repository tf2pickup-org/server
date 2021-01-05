import { SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { MapVoteService } from '../services/map-vote.service';
import { OnModuleInit } from '@nestjs/common';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Events } from '@/events/events';
import { distinctUntilChanged } from 'rxjs/operators';

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit, OnModuleInit {

  private socket: Socket;

  constructor(
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
    private queueAnnouncementsService: QueueAnnouncementsService,
    private friendsService: FriendsService,
    private events: Events,
  ) { }

  onModuleInit() {
    this.events.queueSlotsChange
      .pipe(distinctUntilChanged())
      .subscribe(({ slots }) => this.socket.emit('queue slots update', slots));
    this.events.queueStateChange
      .pipe(distinctUntilChanged())
      .subscribe(({ state }) => this.socket.emit('queue state update', state));
    this.events.queueFriendshipsChange
      .pipe(distinctUntilChanged())
      .subscribe(({ friendships }) => this.socket.emit('friendships update', friendships));
    this.events.mapVotesChange
      .pipe(distinctUntilChanged())
      .subscribe(({ results }) => this.socket.emit('map vote results update', results));
    this.events.substituteRequestsChange.subscribe(async () => {
      const requests = await this.queueAnnouncementsService.substituteRequests();
      this.socket.emit('substitute requests update', requests);
    });
  }

  @WsAuthorized()
  @SubscribeMessage('join queue')
  async joinQueue(client: any, payload: { slotId: number }) {
    return await this.queueService.join(payload.slotId, client.request.user.id);
  }

  @WsAuthorized()
  @SubscribeMessage('leave queue')
  leaveQueue(client: any) {
    return this.queueService.leave(client.request.user.id);
  }

  @WsAuthorized()
  @SubscribeMessage('player ready')
  playerReady(client: any) {
    return this.queueService.readyUp(client.request.user.id);
  }

  @WsAuthorized()
  @SubscribeMessage('mark friend')
  markFriend(client: any, payload: { friendPlayerId: string }) {
    return this.friendsService.markFriend(client.request.user.id, payload.friendPlayerId);
  }

  @WsAuthorized()
  @SubscribeMessage('vote for map')
  voteForMap(client: any, payload: { map: string }) {
    this.mapVoteService.voteForMap(client.request.user.id, payload.map);
    return payload.map;
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
