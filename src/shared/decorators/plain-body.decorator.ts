import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as rawBody from 'raw-body';

export const PlainBody = createParamDecorator(async (_, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest<import('express').Request>();
  if (!req.readable) {
    throw new BadRequestException('Invalid body');
  }

  return (await rawBody(req)).toString().trim();
});
