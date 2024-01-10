import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlayerRole } from '@/players/models/player-role';
import { Player } from '@/players/models/player';
import { Request } from 'express';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<PlayerRole[]>(
      'roles',
      context.getHandler(),
    );
    if (roles?.length) {
      const request = context.switchToHttp().getRequest<Request>();
      const user = request.user as Player;

      if (!user || !roles.some((r) => user.roles.includes(r))) {
        throw new UnauthorizedException();
      }
    }

    return true;
  }
}
