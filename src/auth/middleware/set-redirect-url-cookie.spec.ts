import { NextFunction, Request, Response } from 'express';
import { setRedirectUrlCookie } from './set-redirect-url-cookie';

describe('setRedirectUrlCookie', () => {
  let nextFn: NextFunction;
  let request: Partial<Request>;
  let response: Partial<Response>;

  beforeEach(() => {
    nextFn = jest.fn();
    response = {
      cookie: jest.fn(),
    };
    request = {
      get: jest.fn().mockImplementation(
        (key: string) =>
          ({
            referer: 'FAKE_URL',
          }[key]),
      ),
    };
  });

  it('should set the cookie', () => {
    setRedirectUrlCookie(request as Request, response as Response, nextFn);
    expect(response.cookie).toHaveBeenCalledWith('redirect-url', 'FAKE_URL');
  });

  it('should call the next function', () => {
    setRedirectUrlCookie(request as Request, response as Response, nextFn);
    expect(nextFn).toHaveBeenCalled();
  });
});
