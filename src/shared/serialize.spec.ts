import { Serializable } from './serializable';
import { serialize } from './serialize';

it('should serialize deep nested serializable objects', async () => {
  interface TestDto {
    one: string;
    two: number;
    three: {
      four: string;
    };
  }

  class TestSerializable extends Serializable<TestDto> {
    async serialize(): Promise<TestDto> {
      return {
        one: 'one',
        two: 2,
        three: {
          four: 'four',
        },
      };
    }
  }

  const input = {
    foo: 'bar',
    baz: new TestSerializable(),
    bounce: ['yay', new TestSerializable()],
  };

  expect(await serialize(input)).toEqual({
    foo: 'bar',
    baz: {
      one: 'one',
      two: 2,
      three: {
        four: 'four',
      },
    },
    bounce: [
      'yay',
      {
        one: 'one',
        two: 2,
        three: {
          four: 'four',
        },
      },
    ],
  });
});
