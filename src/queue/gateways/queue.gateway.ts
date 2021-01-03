import { SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { MapVoteService } from '../services/map-vote.service';
import { Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { MapVoteResult } from '../map-vote-result';
import { QueueAnnouncementsService } from '../services/queue-announcements.service';
import { FriendsService } from '../services/friends.service';
import { Events } from '@/events/events';

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit, OnModuleInit {

  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => QueueService)) private queueService: QueueService,
    @Inject(forwardRef(() => MapVoteService)) private mapVoteService: MapVoteService,
    private queueAnnouncementsService: QueueAnnouncementsService,
    private friendsService: FriendsService,
    private events: Events,
  ) { }

  onModuleInit() {
    this.events.queueSlotsChange.subscribe(({ slots }) => this.socket.emit('queue slots update', slots));
    this.events.queueStateChange.subscribe(({ state }) => this.socket.emit('queue state update', state));
    this.events.queueFriendshipsChange.subscribe(({ friendships }) => this.socket.emit('friendships update', friendships));
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

  emitVoteResultsUpdate(mapVoteResults: MapVoteResult[]) {
    this.socket?.emit('map vote results update', mapVoteResults);
  }

  async updateSubstituteRequests() {
    const requests = await this.queueAnnouncementsService.substituteRequests();
    this.socket.emit('substitute requests update', requests);
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
