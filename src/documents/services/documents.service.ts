import { Injectable } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { plainToClass } from 'class-transformer';
import { InjectModel } from 'nestjs-typegoose';
import { Document } from '../models/document';

@Injectable()
export class DocumentsService {

  constructor(
    @InjectModel(Document) private documentModel: ReturnModelType<typeof Document>,
  ) { }

  async getDocument(name: string, language = 'en'): Promise<Document> {
    const pojo = await this.documentModel.findOne({ name, language }).orFail().lean().exec();
    return plainToClass(Document, pojo);
  }

  async saveDocument(name: string, language: string, body: string): Promise<Document> {
    const pojo = await this.documentModel.findOneAndUpdate(
      { name, language },
      { body },
      { upsert: true, new: true },
    ).lean().exec();
    return plainToClass(Document, pojo);
  }

}
