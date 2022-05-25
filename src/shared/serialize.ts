import { Serializable } from './serializable';

export const serialize = async (object: unknown) => {
  if (typeof object !== 'object' || object === null) {
    return object;
  }

  if (object instanceof Serializable) {
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

  await Promise.all(
    Object.keys(object).map(
      async (key) => (object[key] = await serialize(object[key])),
    ),
  );

  return object;
};
