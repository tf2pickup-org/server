import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../services/documents.service';

@Controller('documents')
export class DocumentsController {
  
  constructor(
    private documentsService: DocumentsService,
  ) { }

  @Get(':documentName')
  async getDocument(@Param('documentName') documentName: string) {
    const doc = await this.documentsService.fetchDocument(documentName);
    if (doc) {
      return doc;
    } else {
      throw new NotFoundException();
    }
  }
  
}
