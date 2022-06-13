import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Validator } from 'jsonschema';
import * as mapPoolSchema from '../map-pool.schema.json';
import * as defaultMapPool from '../map-pool.default.json';
import { Events } from '@/events/events';
import { Map, MapDocument } from '../models/map';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MapPoolService implements OnModuleInit {
  private logger = new Logger(MapPoolService.name);

  constructor(
    @InjectModel(Map.name) private mapModel: Model<MapDocument>,
    private events: Events,
  ) {
    new Validator().validate(defaultMapPool, mapPoolSchema, {
      throwError: true,
    });
  }

  async onModuleInit() {
    const mapCount = await this.mapModel.countDocuments();
    if (mapCount === 0) {
      this.logger.log(
        'Map pool empty! Initializing it with the default one...',
      );
      await this.mapModel.insertMany(defaultMapPool.maps);
    }

    this.refreshMaps();
  }

  async getMaps(): Promise<Map[]> {
    return plainToInstance(Map, await this.mapModel.find().lean().exec());
  }

  async addMap(map: Map): Promise<Map> {
    const { _id } = await this.mapModel.create(map);
    this.refreshMaps();
    return plainToInstance(
      Map,
      await this.mapModel.findById(_id).lean().exec(),
    );
  }

  async removeMap(mapName: string): Promise<Map> {
    const ret = plainToInstance(
      Map,
      await this.mapModel.findOneAndRemove({ name: mapName }).lean().exec(),
    );
    this.refreshMaps();
    return ret;
  }

  async setMaps(maps: Map[]): Promise<Map[]> {
    await this.mapModel.deleteMany({});
    await this.mapModel.insertMany(maps);
    await this.refreshMaps();
    return await this.getMaps();
  }

  private async refreshMaps() {
    const maps = await this.getMaps();
    this.events.mapPoolChange.next({ maps });
  }
}
