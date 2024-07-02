import { BadRequestException } from '@nestjs/common';
import { ParseDatePipe } from './parse-date.pipe';

describe('ParseDatePipe', () => {
  it('should be defined', () => {
    expect(new ParseDatePipe()).toBeDefined();
  });

  describe('#transform()', () => {
    let pipe: ParseDatePipe;

    beforeEach(() => {
      pipe = new ParseDatePipe();
    });

    it('should parse valid date', () => {
      expect(pipe.transform('2022-11-16')).toEqual(new Date(2022, 10, 16));
    });

    it('should throw BadRequestException for invalid date formats', () => {
      expect(() => pipe.transform('202211-16')).toThrow(BadRequestException);
      expect(() => pipe.transform('2022-11-32')).toThrow(BadRequestException);
      expect(() => pipe.transform('2022-31-12')).toThrow(BadRequestException);
      expect(() => pipe.transform('2a-13-16')).toThrow(BadRequestException);
      expect(() => pipe.transform('2022-1316')).toThrow(BadRequestException);
    });
  });
});
