import { BadRequestException } from '@nestjs/common';
import { ParseSortParamsPipe } from './parse-sort-params.pipe';

describe('ParseSortParamsPipe', () => {
  let pipe: ParseSortParamsPipe;

  beforeEach(() => {
    pipe = new ParseSortParamsPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should handle launchedAt param', () => {
    expect(pipe.transform('launchedAt')).toEqual({ 'events.0.at': 1 });
    expect(pipe.transform('launched_at')).toEqual({ 'events.0.at': 1 });
    expect(pipe.transform('-launchedAt')).toEqual({ 'events.0.at': -1 });
    expect(pipe.transform('-launched_at')).toEqual({ 'events.0.at': -1 });
  });

  it('should deny invalid params', () => {
    expect(() => pipe.transform('invalid')).toThrow(BadRequestException);
  });
});
