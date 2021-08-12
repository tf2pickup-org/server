import { LogMessageInvalidError } from '../errors/log-message-invalid.error';
import { LogMessage } from '../types/log-message';

/**
 * This code is based on srcds-log-receiver, specifically this file:
 * https://github.com/OpenSourceLAN/srcds-log-receiver/blob/master/PacketParser.ts
 */

const packetHeader = Buffer.from([255, 255, 255, 255]);
const magicStringEndHeader = 'L ';

const extractPassword = (message: Buffer): string => {
  const start = packetHeader.length + 1;
  const end = message.indexOf(magicStringEndHeader);
  if (end < 0) {
    return null;
  } else {
    return message.slice(start, end).toString();
  }
};

const extractPayload = (message: Buffer): string => {
  let start = message.indexOf(magicStringEndHeader);
  if (start < 0) {
    return null;
  }
  start += magicStringEndHeader.length;
  return message.slice(start, message.length - 2).toString();
};

export const parseLogMessage = (message: Buffer): LogMessage => {
  if (message.length < 16) {
    throw new LogMessageInvalidError('message too short');
  }

  if (message.slice(0, 4).compare(packetHeader) !== 0) {
    throw new LogMessageInvalidError('bad header');
  }

  const packetType = message[4];
  if (packetType !== 0x53) {
    throw new LogMessageInvalidError('no password');
  }

  const password = extractPassword(message);
  if (password === null) {
    throw new LogMessageInvalidError('invalid password');
  }

  const payload = extractPayload(message);
  if (payload === null) {
    throw new LogMessageInvalidError('no payload');
  }

  return { payload, password };
};
