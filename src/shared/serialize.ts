import { Serializable } from './serializable';

interface StringIndex {
  [key: string]: any;
}

export const serialize = async <T extends StringIndex>(
  object: T,
): Promise<any> => {
  if (typeof object !== 'object' || object === null) {
    return object;
  }

  if (object instanceof Serializable<T>) {
    const s = await object.serialize();
    for (const key in s) {
      s[key] = await serialize(s[key]);
    }

    return s;
  }

  if (Array.isArray(object)) {
    return await Promise.all(
      object.map(async (element) => await serialize(element)),
    );
  }

  const ret: Record<string, T[keyof T]> = {};
  await Promise.all(
    Object.keys(object).map(
      async (key) => (ret[key] = await serialize(object[key])),
    ),
  );

  return ret;
};
