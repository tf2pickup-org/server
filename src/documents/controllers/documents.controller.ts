import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { DocumentNotFoundFilter } from '@/shared/filters/document-not-found.filter';
import { Body, ClassSerializerInterceptor, Controller, DefaultValuePipe, Get, Param, Put, Query, UseFilters, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { Document } from '../models/document';
import { DocumentsService } from '../services/documents.service';

@Controller('documents')
export class DocumentsController {

  constructor(
    private documentsService: DocumentsService,
  ) { }

  @Get(':name')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseFilters(DocumentNotFoundFilter)
  async getDocument(
    @Param('name') name: string,
    @Query('language', new DefaultValuePipe('en')) language: string,
  ) {
    return this.documentsService.getDocument(name, language);
  }

  @Put(':name')
  @UseInterceptors(ClassSerializerInterceptor)
  @UsePipes(ValidationPipe)
  @Auth(PlayerRole.admin)
  async saveDocument(
    @Param('name') name: string,
    @Query('language', new DefaultValuePipe('en')) language: string,
    @Body() document: Document,
  ) {
    return this.documentsService.saveDocument(name, language, document.body);
  }

}
