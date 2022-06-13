import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Validator } from 'jsonschema';
import * as mapPoolSchema from '../map-pool.schema.json';
import * as defaultMapPool from '../map-pool.default.json';
import { Events } from '@/events/events';
import { MapPoolItem, MapPoolItemDocument } from '../models/map-pool-item';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MapPoolService implements OnModuleInit {
  private logger = new Logger(MapPoolService.name);

  constructor(
    @InjectModel(MapPoolItem.name)
    private mapPoolItemModel: Model<MapPoolItemDocument>,
    private events: Events,
  ) {
    new Validator().validate(defaultMapPool, mapPoolSchema, {
      throwError: true,
    });
  }

  async onModuleInit() {
    const mapCount = await this.mapPoolItemModel.countDocuments();
    if (mapCount === 0) {
      this.logger.log(
        'Map pool empty! Initializing it with the default one...',
      );
      await this.mapPoolItemModel.insertMany(defaultMapPool.maps);
    }

    await this.refreshMaps();
  }

  async getMaps(): Promise<MapPoolItem[]> {
    return plainToInstance(
      MapPoolItem,
      await this.mapPoolItemModel.find().lean().exec(),
    );
  }

  async addMap(map: MapPoolItem): Promise<MapPoolItem> {
    const { _id } = await this.mapPoolItemModel.create(map);
    await this.refreshMaps();
    return plainToInstance(
      MapPoolItem,
      await this.mapPoolItemModel.findById(_id).lean().exec(),
    );
  }

  async removeMap(mapName: string): Promise<MapPoolItem> {
    const ret = plainToInstance(
      MapPoolItem,
      await this.mapPoolItemModel
        .findOneAndRemove({ name: mapName })
        .lean()
        .exec(),
    );
    await this.refreshMaps();
    return ret;
  }

  async setMaps(maps: MapPoolItem[]): Promise<MapPoolItem[]> {
    await this.mapPoolItemModel.deleteMany({});
    await this.mapPoolItemModel.insertMany(maps);
    await this.refreshMaps();
    return await this.getMaps();
  }

  private async refreshMaps() {
    const maps = await this.getMaps();
    this.events.mapPoolChange.next({ maps });
  }
}
