import { NextFunction, Request, Response } from 'express';

export const redirectUrlCookieName = 'redirect-url';

export const setRedirectUrlCookie = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Set the current url as a cookie so we can redirect to the exact url afterwards
  if (req.query.url) {
    res.cookie(redirectUrlCookieName, req.query.url);
  }

  next();
};
