export abstract class Serializable<T> {
  abstract serialize(): Promise<T>;
}
