import { Serializable } from './serializable';

interface StringIndex {
  // skipcq: JS-0323
  [key: string]: any;
}

export const serialize = async <T extends StringIndex>(
  object: T,
): Promise<Record<string, unknown> | Record<string, unknown>[]> => {
  if (typeof object !== 'object' || object === null) {
    return object;
  }

  if (object instanceof Serializable) {
    const ret = await object.serialize();
    for (const key of Object.keys(ret)) {
      ret[key] = await serialize(ret[key]);
    }

    return ret;
  }

  if (Array.isArray(object)) {
    return (await Promise.all(
      object.map(async (element) => await serialize(element)),
    )) as Record<string, unknown>[];
  }

  const ret: Record<string, unknown> = {};
  await Promise.all(
    Object.keys(object).map(
      async (key) => (ret[key] = await serialize(object[key])),
    ),
  );

  return ret;
};
