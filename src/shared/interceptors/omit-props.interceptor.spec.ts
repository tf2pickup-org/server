import { Reflector } from '@nestjs/core';
import { OmitPropsInterceptor } from './omit-props.interceptor';

describe('OmitPropsInterceptor', () => {
  it('should be defined', () => {
    expect(new OmitPropsInterceptor(new Reflector())).toBeDefined();
  });
});
