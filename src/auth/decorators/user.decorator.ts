import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// tslint:disable-next-line: variable-name
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);
