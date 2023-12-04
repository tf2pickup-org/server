import { z } from 'zod';
import { ZodPipe } from './zod.pipe';

const testSchema = z.object({
  foo: z.string(),
});

describe('ZodPipe', () => {
  let pipe: ZodPipe<typeof testSchema>;

  beforeEach(() => {
    pipe = new ZodPipe(testSchema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('when input is valid', () => {
    it('should return parsed value', () => {
      expect(pipe.transform({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });
  });

  describe('when input is invalid', () => {
    it('should throw', () => {
      expect(() => pipe.transform({})).toThrow();
    });
  });
});
