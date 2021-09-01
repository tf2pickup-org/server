import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { readFile } from 'fs/promises';
import { Error, Model } from 'mongoose';
import { join } from 'path';
import { Document, DocumentDocument } from '../models/document';

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(
    @InjectModel(Document.name)
    private documentModel: Model<DocumentDocument>,
  ) {}

  async onModuleInit() {
    // ensure we have the rules document created
    try {
      await this.getDocument('rules');
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        const rules = await readFile(
          join(__dirname, '..', 'default', 'rules.md'),
        );
        await this.saveDocument('rules', 'en', rules.toString());
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
