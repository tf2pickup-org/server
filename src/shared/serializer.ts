import { Serializable } from './serializable';

export abstract class Serializer<E, T> {
  abstract serialize(entity: E): Promise<T>;

  markSerializableValue(value: E): Serializable<T> {
    return new Serializable<T>(this.serialize.bind(this, value));
  }

  markSerializableCollection(values: E[]): Serializable<T[]> {
    return new Serializable<T[]>(this.serializeCollection.bind(this, values));
  }

  private async serializeCollection(entities: E[]): Promise<T[]> {
    return Promise.all<T>(entities.map((entity) => this.serialize(entity)));
  }
}
