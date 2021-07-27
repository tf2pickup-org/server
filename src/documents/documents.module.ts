import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './controllers/documents.controller';
import { Document, documentSchema } from './models/document';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Document.name, schema: documentSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
