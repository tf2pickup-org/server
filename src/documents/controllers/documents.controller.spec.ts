import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from '../services/documents.service';

jest.mock('../services/documents.service');

describe('Documents Controller', () => {
  let controller: DocumentsController;
  let documentsService: jest.Mocked<DocumentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        DocumentsService,
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    documentsService = module.get(DocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
