import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { QueueService } from '../services/queue.service';
import { WsAuthorized } from '@/auth/decorators/ws-authorized.decorator';

@WebSocketGateway()
export class QueueGateway {

  constructor(
    private queueService: QueueService,
  ) { }

  @WsAuthorized()
  @SubscribeMessage('join queue')
  async joinQueue(client: any, payload: number) {
    const slots = await this.queueService.join(payload, client.request.user.id);
    return { value: slots };
  }

}
