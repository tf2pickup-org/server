import { splitToChunks } from './split-to-chunks';

it('should split array of numbers to chunks', () => {
  const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const chunkSize = 3;
  const result = splitToChunks(array, chunkSize);
  expect(result).toEqual([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]);
});

describe('when an array length is smaller than chunks size', () => {
  it('should return one chunk', () => {
    const array = [1, 2];
    const chunkSize = 3;
    const result = splitToChunks(array, chunkSize);
    expect(result).toEqual([[1, 2]]);
  });
});
