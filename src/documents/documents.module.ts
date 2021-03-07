import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { DocumentsController } from './controllers/documents.controller';
import { Document } from './models/document';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [
    TypegooseModule.forFeature([ Document ]),
  ],
  controllers: [
    DocumentsController,
  ],
  providers: [
    DocumentsService,
  ],
})
export class DocumentsModule {}
