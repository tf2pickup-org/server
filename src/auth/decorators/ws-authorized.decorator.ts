import { applyDecorators, UseGuards } from '@nestjs/common';
import { WsAuthorizedGuard } from '../guards/ws-authorized.guard';

export function WsAuthorized() {
  return applyDecorators(
    UseGuards(WsAuthorizedGuard),
  );
}
