import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlayerRole } from '@/players/models/player-role';
import { RoleGuard } from './guards/role.guard';

export function Auth(...roles: PlayerRole[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt')),
    SetMetadata('roles', roles),
    UseGuards(RoleGuard),
  );
}
