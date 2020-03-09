import { Module, HttpModule } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';

@Module({
  controllers: [
    DocumentsController,
  ],
  providers: [
    DocumentsService,
  ],
  imports: [
    HttpModule,
  ],
})
export class DocumentsModule {}
