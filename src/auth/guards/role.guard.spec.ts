import { RoleGuard } from './role.guard';
import { TestingModule, Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

const context = {
  getHandler: () => null,
  switchToHttp: () => null,
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
    jest.spyOn(reflector, 'get').mockImplementation(() => ['super-user']);
    jest.spyOn(context, 'switchToHttp').mockImplementation(() => ({
      getRequest: () => ({
        user: {
          role: 'super-user',
        },
      }),
    }));
    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('should dany when the user does not have the required role', () => {
    jest.spyOn(reflector, 'get').mockImplementation(() => ['super-user']);
    jest.spyOn(context, 'switchToHttp').mockImplementation(() => ({
      getRequest: () => ({
        user: {
          role: 'admin',
        },
      }),
    }));
    expect(() => guard.canActivate(context as any)).toThrow(/*new UnauthorizedException()*/);
  });
});
