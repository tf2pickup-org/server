import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from '../services/documents.service';
import { NotFoundException } from '@nestjs/common';

class DocumentsServiceStub {
  async fetchDocument(documentName: string) {
    return Promise.resolve('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris in.');
  }
}

describe('Documents Controller', () => {
  let controller: DocumentsController;
  let documentsService: DocumentsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useClass: DocumentsServiceStub },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    documentsService = module.get(DocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDocument()', () => {
    it('should return the document', async () => {
      const ret = await controller.getDocument('RULES.md');
      expect(ret).toEqual('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris in.');
    });

    describe('when the document could not be found', () => {
      beforeEach(() => {
        jest.spyOn(documentsService, 'fetchDocument').mockResolvedValue(undefined);
      });

      it('should return 404', async () => {
        expect(controller.getDocument('RULES.md')).rejects.toThrow(new NotFoundException());
      });
    });
  });
});
