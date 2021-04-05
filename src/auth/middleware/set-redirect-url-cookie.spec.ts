import { NextFunction, Response } from 'express';
import { setRedirectUrlCookie } from './set-redirect-url-cookie';

describe('setRedirectUrlCookie', () => {
  let nextFn: NextFunction;
  let response: Partial<Response>;

  beforeEach(() => {
    nextFn = jest.fn();
    response = {
      cookie: jest.fn(),
    };
  });

  it('should set the cookie', () => {
    setRedirectUrlCookie(
      { query: { url: 'FAKE_URL' } } as any,
      response as any,
      nextFn,
    );
    expect(response.cookie).toHaveBeenCalledWith('redirect-url', 'FAKE_URL');
  });

  it('should call the next function', () => {
    setRedirectUrlCookie({ query: {} } as any, response as any, nextFn);
    expect(nextFn).toHaveBeenCalled();
  });
});
