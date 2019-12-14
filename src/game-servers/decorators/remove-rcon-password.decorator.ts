import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { RemoveRconPasswordInterceptor } from '../interceptors/remove-rcon-password.interceptor';

export function RemoveRconPassword() {
  return applyDecorators(
    UseInterceptors(RemoveRconPasswordInterceptor),
  );
}
