import { NextFunction, Request, Response } from 'express';

export const redirectUrlCookieName = 'redirect-url';

export const setRedirectUrlCookie = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const referer = req.get('referer');

  // Set the referer url as a cookie so we can redirect to the exact url afterwards
  if (referer) {
    res.cookie(redirectUrlCookieName, referer);
  }

  next();
};
