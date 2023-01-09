import { IncomingHttpHeaders } from 'http';

export const extractClientIp = (
  headers: IncomingHttpHeaders,
): string | undefined => {
  if (headers['x-forwarded-for']) {
    const xForwarderFor = headers['x-forwarded-for'];
    if (!Array.isArray(xForwarderFor)) {
      const first = xForwarderFor.split(',').at(0);
      if (first) {
        return first.trim();
      }
    } else {
      return xForwarderFor[0];
    }
  }

  if (headers['x-real-ip']) {
    return headers['x-real-ip'].toString();
  }
};
