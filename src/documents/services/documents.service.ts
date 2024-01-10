import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { readFile } from 'fs/promises';
import { Error, Model } from 'mongoose';
import { join } from 'path';
import { Document } from '../models/document';

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(
    @InjectModel(Document.name)
    private documentModel: Model<Document>,
  ) {}

  async onModuleInit() {
    await this.initDocument(
      'rules',
      join(__dirname, '..', 'default', 'rules.md'),
    );
    await this.initDocument(
      'privacy policy',
      join(__dirname, '..', 'default', 'privacy-policy.md'),
    );
  }

  async getDocument(name: string, language = 'en'): Promise<Document> {
    const pojo = await this.documentModel
      .findOne({ name, language })
      .orFail()
      .lean()
      .exec();
    return plainToInstance(Document, pojo);
  }

  async saveDocument(
    name: string,
    language: string,
    body?: string,
  ): Promise<Document> {
    const pojo = await this.documentModel
      .findOneAndUpdate(
        { name, language },
        { body },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return plainToInstance(Document, pojo);
  }

  private async initDocument(name: string, path: string) {
    try {
      await this.getDocument(name);
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        const document = await readFile(path);
        await this.saveDocument(name, 'en', document.toString());
      } else {
        throw error;
      }
    }
  }
}
