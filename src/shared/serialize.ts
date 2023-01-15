import { Serializable } from './serializable';

interface StringIndex {
  [key: string]: any;
}

const serializeSerializable = async <
  K extends StringIndex,
  T extends Serializable<K>,
>(
  value: T,
): Promise<any> => {
  const ret = await value.serialize();
  for (const key in ret) {
    ret[key] = await serialize(ret[key]);
  }

  return ret;
};

const serializeObject = async <T extends StringIndex>(
  value: T,
): Promise<any> => {
  const ret: Record<string, T[keyof T]> = {};
  await Promise.all(
    Object.keys(value).map(
      async (key) => (ret[key] = await serialize(value[key])),
    ),
  );

  return ret;
};

const serializeArray = async <T extends StringIndex>(
  value: T[],
): Promise<any> => {
  return await Promise.all(
    value.map(async (element) => await serialize(element)),
  );
};

export const serialize = async <T extends StringIndex>(
  object: T,
): Promise<T> => {
  if (typeof object !== 'object' || object === null) {
    return object;
  }

  if (object instanceof Serializable) {
    return await serializeSerializable(object);
  }

  if (Array.isArray(object)) {
    return await serializeArray(object);
  }

  return await serializeObject(object);
};
