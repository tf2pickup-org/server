export abstract class Serializable<T> {
  abstract serialize(): T | Promise<T>;
}
