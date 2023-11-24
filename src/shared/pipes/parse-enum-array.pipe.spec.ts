import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ParseEnumArrayPipe } from './parse-enum-array.pipe';

enum TestEnum {
  one = 'one',
  two = 'two',
}

describe('ParseEnumArrayPipe', () => {
  let pipe: ParseEnumArrayPipe<typeof TestEnum>;

  beforeEach(() => {
    pipe = new ParseEnumArrayPipe(TestEnum);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should split values', () => {
    expect(
      pipe.transform('one,two', { data: 'arg' } as ArgumentMetadata),
    ).toEqual([TestEnum.one, TestEnum.two]);
  });

  describe('when value is empty', () => {
    it('should throw', () => {
      expect(() =>
        pipe.transform('', { data: 'arg' } as ArgumentMetadata),
      ).toThrow(BadRequestException);
    });
  });

  describe('when value is invalid', () => {
    it('should throw', () => {
      expect(() =>
        pipe.transform('one,two,three', { data: 'arg' } as ArgumentMetadata),
      ).toThrow(BadRequestException);
    });
  });
});
