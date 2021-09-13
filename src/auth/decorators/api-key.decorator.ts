import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function ApiKey() {
  return applyDecorators(UseGuards(AuthGuard('api-key')));
}
