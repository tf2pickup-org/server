export class Serializable<T> {
  constructor(public readonly serialize: () => Promise<T | T[]>) {}
}
