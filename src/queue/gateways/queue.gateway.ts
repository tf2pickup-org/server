import { SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';
import { Socket } from 'socket.io';
import { Tf2Map } from '../tf2-map';
import { MapVoteService } from '../services/map-vote.service';

@WebSocketGateway()
export class QueueGateway implements OnGatewayInit {

  constructor(
    private queueService: QueueService,
    private mapVoteService: MapVoteService,
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
  @SubscribeMessage('vote for map')
  voteForMap(client: any, payload: { map: Tf2Map }) {
    this.mapVoteService.voteForMap(client.request.user.id, payload.map);
    return payload.map;
  }

  afterInit(socket: Socket) {
    this.queueService.slotsChange.subscribe(slots => socket.emit('queue slots update', slots));
    this.queueService.stateChange.subscribe(state => socket.emit('queue state update', state));
    this.mapVoteService.resultsChange.subscribe(results => socket.emit('map vote results update', results));
  }

}
