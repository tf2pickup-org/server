import { DocumentNotFoundFilter } from './document-not-found.filter';
import { Error } from 'mongoose';

describe('DocumentNotFoundFilter', () => {
  it('should be defined', () => {
    expect(new DocumentNotFoundFilter()).toBeDefined();
  });

  it('should handle the error', () => {
    const response = {
      status: jest.fn().mockImplementation(() => response),
      json: jest.fn().mockImplementation(() => response),
    };

    const request = {
      url: '/some/invalid/path',
    };

    const ctx = {
      getResponse: () => response,
      getRequest: () => request,
    };

    const host = {
      switchToHttp: () => ctx,
    };

    const filter = new DocumentNotFoundFilter();
    filter.catch(new Error.DocumentNotFoundError(''), host as any);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      path: '/some/invalid/path',
    });
  });
});
