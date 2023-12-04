import { SafeParseError, ZodIssueCode, z } from 'zod';
import { ZodFilter } from './zod.filter';
import { ArgumentsHost } from '@nestjs/common';
import { HttpArgumentsHost, WsArgumentsHost } from '@nestjs/common/interfaces';

const testSchema = z.object({
  foo: z.string(),
});

describe('ZodFilter', () => {
  let filter: ZodFilter;
  let host: jest.Mocked<ArgumentsHost>;

  beforeEach(() => {
    filter = new ZodFilter();
    host = {
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('when context is http', () => {
    let ctx: jest.Mocked<HttpArgumentsHost>;
    let response: { status: () => void; json: () => void };

    beforeEach(() => {
      response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      ctx = {
        getRequest: jest.fn(),
        getResponse: jest.fn().mockReturnValue(response),
        getNext: jest.fn(),
      };

      host.getType.mockReturnValue('http');
      host.switchToHttp.mockReturnValue(ctx);
    });

    it('should return 400', () => {
      const result = testSchema.safeParse({}) as SafeParseError<any>;
      filter.catch(result.error, host);
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        errors: expect.any(Array),
        message: expect.anything(),
        statusCode: 400,
      });
    });
  });

  describe('when context is ws', () => {
    let ctx: jest.Mocked<WsArgumentsHost>;
    let client: { emit: () => void };

    beforeEach(() => {
      client = {
        emit: jest.fn(),
      };

      ctx = {
        getData: jest.fn(),
        getClient: jest.fn().mockReturnValue(client),
        getPattern: jest.fn(),
      };

      host.getType.mockReturnValue('ws');
      host.switchToWs.mockReturnValue(ctx);
    });

    it('should emit exception', () => {
      const result = testSchema.safeParse({}) as SafeParseError<any>;
      filter.catch(result.error, host);

      expect(client.emit).toHaveBeenCalledWith('exception', {
        errors: expect.any(Array),
        message: expect.anything(),
      });
    });
  });
});
