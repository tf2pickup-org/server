import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway()
export class QueueGateway {

  @SubscribeMessage('join queue')
  async joinQueue(client: any, payload: any) {
    console.log(client);
    console.log(payload);
  }

}
