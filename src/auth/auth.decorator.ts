import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

type Role = 'admin' | 'super-user';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt')),
  );
}
