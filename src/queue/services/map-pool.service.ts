import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Events } from '@/events/events';
import { MapPoolEntry } from '../models/map-pool-entry';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { defaultMapPool } from '../default-map-pool';

@Injectable()
export class MapPoolService implements OnModuleInit {
  private logger = new Logger(MapPoolService.name);

  constructor(
    @InjectModel(MapPoolEntry.name)
    private readonly mapPoolEntryModel: Model<MapPoolEntry>,
    private readonly events: Events,
  ) {}

  async onModuleInit() {
    const mapCount = await this.mapPoolEntryModel.countDocuments();
    if (mapCount === 0) {
      this.logger.log(
        'Map pool empty! Initializing it with the default one...',
      );
      await this.mapPoolEntryModel.insertMany(defaultMapPool);
    }

    await this.refreshMaps();
  }

  async getMaps(): Promise<MapPoolEntry[]> {
    return plainToInstance(
      MapPoolEntry,
      await this.mapPoolEntryModel.find().lean().exec(),
    );
  }

  async addMap(map: MapPoolEntry): Promise<MapPoolEntry> {
    const { _id } = await this.mapPoolEntryModel.create(map);
    await this.refreshMaps();
    return plainToInstance(
      MapPoolEntry,
      await this.mapPoolEntryModel.findById(_id).lean().exec(),
    );
  }

  async removeMap(mapName: string): Promise<MapPoolEntry> {
    const ret = plainToInstance(
      MapPoolEntry,
      await this.mapPoolEntryModel
        .findOneAndDelete({ name: mapName })
        .lean()
        .exec(),
    );
    await this.refreshMaps();
    return ret;
  }

  async setMaps(maps: MapPoolEntry[]): Promise<MapPoolEntry[]> {
    await this.mapPoolEntryModel.deleteMany({});
    await this.mapPoolEntryModel.insertMany(maps);
    await this.refreshMaps();
    return await this.getMaps();
  }

  private async refreshMaps() {
    const maps = await this.getMaps();
    this.events.mapPoolChange.next({ maps });
  }
}
