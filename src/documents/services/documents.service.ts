import { Injectable, OnModuleInit } from '@nestjs/common';
import { mongoose, ReturnModelType } from '@typegoose/typegoose';
import { plainToClass } from 'class-transformer';
import { InjectModel } from 'nestjs-typegoose';
import { Document } from '../models/document';

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(
    @InjectModel(Document)
    private documentModel: ReturnModelType<typeof Document>,
  ) {}

  async onModuleInit() {
    // ensure we have the rules document created
    try {
      await this.getDocument('rules');
    } catch (error) {
      if (error instanceof mongoose.Error.DocumentNotFoundError) {
        await this.saveDocument('rules', 'en', '');
      } else {
        throw error;
      }
    }
  }

  async getDocument(name: string, language = 'en'): Promise<Document> {
    const pojo = await this.documentModel
      .findOne({ name, language })
      .orFail()
      .lean()
      .exec();
    return plainToClass(Document, pojo);
  }

  async saveDocument(
    name: string,
    language: string,
    body: string,
  ): Promise<Document> {
    const pojo = await this.documentModel
      .findOneAndUpdate(
        { name, language },
        { body },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return plainToClass(Document, pojo);
  }
}
