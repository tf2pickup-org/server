import { IncomingHttpHeaders } from 'http';
import { isArray } from 'lodash';

export const extractClientIp = (headers: IncomingHttpHeaders): string => {
  if (headers['x-forwarded-for']) {
    const xForwarderFor = headers['x-forwarded-for'];
    if (!isArray(xForwarderFor)) {
      return xForwarderFor.split(',').at(0).trim();
    } else {
      return xForwarderFor[0];
    }
  }

  if (headers['x-real-ip']) {
    return headers['x-real-ip'].toString();
  }
};
