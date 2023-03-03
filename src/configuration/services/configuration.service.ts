import { Events } from '@/events/events';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigurationEntry } from '../configuration-entry';
import { ConfigurationEntryNotFoundError } from '../errors/configuration-entry-not-found.error';
import {
  ConfigurationItem,
  ConfigurationItemDocument,
} from '../models/configuration-item';
import { generateSchema } from '@anatine/zod-openapi';
import { ZodType, ZodTypeAny } from 'zod';

interface ConfigurationEntryDescription {
  key: string;
  schema: string;
  value: unknown;
  defaultValue: unknown;
  description?: string;
}

type KeyType = string;

@Injectable()
export class ConfigurationService {
  private entries = new Map<KeyType, ConfigurationEntry<ZodType<unknown>>>();

  constructor(
    @InjectModel(ConfigurationItem.name)
    private configurationItemModel: Model<ConfigurationItemDocument>,
    private events: Events,
  ) {}

  register<S extends ZodTypeAny[]>(
    ...entries: ConfigurationEntry<S[number]>[]
  ) {
    entries.forEach((entry) => {
      entry.schema.parse(entry.default);
      this.entries.set(entry.key, entry);
    });
  }

  async get<T>(key: string): Promise<T> {
    if (!this.entries.has(key)) {
      throw new ConfigurationEntryNotFoundError(key);
    }

    const item = await this.configurationItemModel.findOne({ key });
    if (item) {
      return item.value as T;
    }

    return this.entries.get(key)!.default as T;
  }

  async set<T>(key: string, value: T): Promise<T> {
    const oldValue = await this.get(key);
    const entry = this.entries.get(key)!;
    const newValue = await entry.schema.parseAsync(value);
    await this.configurationItemModel.findOneAndUpdate(
      { key },
      { $set: { value: newValue } },
      { upsert: true },
    );
    this.events.configurationChanged.next({ key, oldValue, newValue });
    return newValue as T;
  }

  async reset<T>(key: string): Promise<T> {
    const oldValue = await this.get(key);
    const entry = this.entries.get(key)!;
    await this.configurationItemModel.deleteOne({ key });
    const newValue = entry.default;
    this.events.configurationChanged.next({ key, oldValue, newValue });
    return newValue as T;
  }

  async describe(key: string): Promise<ConfigurationEntryDescription> {
    const value = await this.get(key);
    const entry = this.entries.get(key)!;

    return {
      key,
      schema: generateSchema(entry.schema),
      value,
      defaultValue: entry.default,
      description: entry.description,
    };
  }

  async describeAll(): Promise<ConfigurationEntryDescription[]> {
    return await Promise.all(
      Array.from(this.entries.keys()).map((key) => this.describe(key)),
    );
  }
}
