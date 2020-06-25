import { IsOneOfPipe } from './is-one-of.pipe';
import { BadRequestException } from '@nestjs/common';

describe('IsOneOfPipe', () => {
  it('should be defined', () => {
    expect(new IsOneOfPipe([])).toBeDefined();
  });

  it('should return the value if it\'s allowed', () => {
    expect(new IsOneOfPipe(['one', 'two']).transform('one', null)).toEqual('one');
  });

  it('should throw an error if the value is not allowed', () => {
    expect(() => new IsOneOfPipe(['one', 'two']).transform('three', { type: 'query', data: 'field' }))
      .toThrow(BadRequestException);
  });
});
