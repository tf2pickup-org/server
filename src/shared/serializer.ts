import { Serializable } from './serializable';

export abstract class Serializer<E, T> {
  abstract serialize(entity: E): Promise<T>;

  markAsSerializable(value: E): Serializable<T>;
  markAsSerializable(value: E[]): Serializable<T[]>;

  markAsSerializable(value: E | E[]): Serializable<T> | Serializable<T[]> {
    if (Array.isArray(value)) {
      return new Serializable<T[]>(this.serializeCollection.bind(this, value));
    } else {
      return new Serializable<T>(this.serialize.bind(this, value));
    }
  }

  private async serializeCollection(entities: E[]): Promise<T[]> {
    return Promise.all<T>(entities.map((entity) => this.serialize(entity)));
  }
}
