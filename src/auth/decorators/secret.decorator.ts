import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function Secret() {
  return applyDecorators(UseGuards(AuthGuard('secret')));
}
