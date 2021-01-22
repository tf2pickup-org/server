import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Validator } from 'jsonschema';
import * as mapPoolSchema from '../map-pool.schema.json';
import * as defaultMapPool from '../map-pool.default.json';
import { Events } from '@/events/events';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { Map } from '../models/map';

@Injectable()
export class MapPoolService implements OnModuleInit {

  private logger = new Logger(MapPoolService.name);

  maps: Map[] = defaultMapPool.maps;

  constructor(
    @InjectModel(Map) private mapModel: ReturnModelType<typeof Map>,
    private events: Events,
  ) {
    new Validator().validate(defaultMapPool, mapPoolSchema, { throwError: true });
    // this.events.mapPoolChange.next({ maps: this.maps });
  }

  async onModuleInit() {
    const mapCount = await this.mapModel.countDocuments();
    if (mapCount === 0) {
      this.logger.log('Map pool empty! Initializing it with the default one...');
      await this.mapModel.insertMany(defaultMapPool.maps);
    }

    this.maps = await this.mapModel.find();
    this.events.mapPoolChange.next({ maps: this.maps });
  }

}
