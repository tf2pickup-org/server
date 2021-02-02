import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsClient } from '../ws-client';

@Injectable()
export class WsAuthorizedGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient() as WsClient;
    if (client?.request?.user?.logged_in) {
      return true;
    } else {
      throw new WsException('unauthorized');
    }
  }
}
