import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class WsAuthorizedGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    if (client?.request?.user?.logged_in) {
      return true;
    } else {
      return false;
    }
  }
}
