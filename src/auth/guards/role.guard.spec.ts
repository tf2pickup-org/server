import { RoleGuard } from './role.guard';
import { TestingModule, Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PlayerRole } from '@/players/models/player-role';
import { UnauthorizedException } from '@nestjs/common';

const context = {
  getHandler: () => null,
  switchToHttp: jest.fn(),
};

describe('RoleGuard', () => {
  let reflector: Reflector;
  let guard: RoleGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({ }).compile();
    reflector = module.get<Reflector>(Reflector);
    guard = new RoleGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow when there are no roles required', () => {
    jest.spyOn(reflector, 'get').mockImplementation(() => []);
    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should allow when the user has the required role', () => {
    jest.spyOn(reflector, 'get').mockImplementation(() => [ PlayerRole.superUser ]);
    context.switchToHttp.mockImplementation(() => ({
      getRequest: () => ({
        user: {
          roles: [ PlayerRole.superUser ]
        },
      }),
    }));
    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should deny when the user does not have the required role', () => {
    jest.spyOn(reflector, 'get').mockImplementation(() => [ PlayerRole.superUser ]);
    context.switchToHttp.mockImplementation(() => ({
      getRequest: () => ({
        user: {
          roles: [ PlayerRole.admin ],
        },
      }),
    }));
    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
  });
});
