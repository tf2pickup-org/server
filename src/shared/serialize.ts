// TODO remove eslint-disable comments
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { StreamableFile } from '@nestjs/common';
import { Serializable } from './serializable';

type StringIndex = Record<string, any>;

type SerializeResult<T> =
  T extends Serializable<infer R> ? R : Record<keyof T, unknown>;

// skipcq: JS-0323
type Flatten<T> = T extends any[] ? T[number] : T;

export async function serialize<T>(object: T): Promise<SerializeResult<T>>;
export async function serialize<T>(
  object: T[],
): Promise<SerializeResult<Flatten<T>>[]>;

export async function serialize<T extends StringIndex>(
  object: T | T[],
): Promise<SerializeResult<T> | SerializeResult<T>[] | StreamableFile> {
  if (
    typeof object !== 'object' ||
    object === null ||
    object instanceof StreamableFile
  ) {
    return object;
  }

  if (Array.isArray(object)) {
    return (await Promise.all(
      object.map(async (element) => await serialize<typeof element>(element)),
    )) as SerializeResult<T>[];
  }

  if (object instanceof Serializable) {
    const ret = await object.serialize();
    for (const key of Object.keys(ret)) {
      ret[key] = await serialize(ret[key]);
    }

    return ret;
  }

  return Object.fromEntries(
    await Promise.all(
      Object.entries(object).map(async ([key, value]) => [
        key,
        await serialize(value),
      ]),
    ),
  );
}
