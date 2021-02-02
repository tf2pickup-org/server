import { Reflector } from '@nestjs/core';
import { OmitDeepInterceptor } from './omit-deep.interceptor';

describe('OmitDeepInterceptor', () => {
  it('should be defined', () => {
    expect(new OmitDeepInterceptor(new Reflector())).toBeDefined();
  });
});
