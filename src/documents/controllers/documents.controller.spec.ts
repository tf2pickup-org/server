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

  describe('#getDocument', () => {
    beforeEach(() => {
      documentsService.getDocument.mockImplementation((name, language) => Promise.resolve({ name, language, body: 'testing' }));
    });

    it('should query the service', async () => {
      await controller.getDocument('test', 'en');
      expect(documentsService.getDocument).toHaveBeenCalledWith('test', 'en');
    });
  });

  describe('#saveDocument', () =>{
    beforeEach(() => {
      documentsService.saveDocument.mockImplementation((name, language, body) => Promise.resolve({ name, language, body }));
    });

    it('should call the service', async () => {
      await controller.saveDocument('test', 'en', { name: 'test', language: 'en', body: 'just testing' });
      expect(documentsService.saveDocument).toHaveBeenCalledWith('test', 'en', 'just testing');
    });
  });
});
