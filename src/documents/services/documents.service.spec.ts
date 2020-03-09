import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { HttpService } from '@nestjs/common';
import { of, throwError } from 'rxjs';

class HttpServiceStub {
  get(url: string) {
    return of({
      status: 200,
      statusText: 'OK',
      data: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris in.',
    });
  }
}

describe('DocumentsService', () => {
  let service: DocumentsService;
  let httpService: HttpServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: HttpService, useClass: HttpServiceStub },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchDocument()', () => {
    it('should return the document content', async () => {
      const ret = await service.fetchDocument('README.md');
      expect(ret).toEqual('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris in.');
    });

    describe('when errored with 404', () => {
      beforeEach(() => {
        jest.spyOn(httpService, 'get').mockReturnValue(throwError({
          message: 'Request failed with status code 404',
          name: 'Error',
        }));
      });

      it('should return undefined', async () => {
        expect(service.fetchDocument('some random document')).resolves.toBe(undefined);
      });
    });
  });
});
