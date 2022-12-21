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
  });
});
