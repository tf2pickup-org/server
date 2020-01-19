import { SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { Tf2Map } from '../tf2-map';
import { MapVoteService } from '../services/map-vote.service';
import { QueueSlot } from '../queue-slot';
import { QueueState } from '../queue-state';
import { Inject, forwardRef } from '@nestjs/common';
import { MapVoteResult } from '../map-vote-result';

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit {

  private socket: Socket;

  constructor(
    @Inject(forwardRef(() => QueueService)) private queueService: QueueService,
    @Inject(forwardRef(() => MapVoteService)) private mapVoteService: MapVoteService,
  ) { }

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
  async markFriend(client: any, paylod: { friendPlayerId: string }) {
    return await this.queueService.markFriend(client.request.user.id, paylod.friendPlayerId);
  }

  @WsAuthorized()
  @SubscribeMessage('vote for map')
  voteForMap(client: any, payload: { map: Tf2Map }) {
    this.mapVoteService.voteForMap(client.request.user.id, payload.map);
    return payload.map;
  }

  emitSlotsUpdate(slots: QueueSlot[]) {
    this.socket.emit('queue slots update', slots);
  }

  emitStateUpdate(state: QueueState) {
    this.socket.emit('queue state update', state);
  }

  emitVoteResultsUpdate(mapVoteResults: MapVoteResult[]) {
    this.socket.emit('map vote results update', mapVoteResults);
  }

  afterInit(socket: Socket) {
    this.socket = socket;
  }

}
