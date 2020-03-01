'use strict';

const gamedig = jest.genMockFromModule('gamedig');

const originalResult = {
  name: 'test server',
  map: 'test map',
  password: false,
  maxplayers: 24,
  players: [],
  bots: [],
  ping: 123,
  raw: { },
}

let result = { ...originalResult };

function __resetResult() {
  result = { ...originalResult };
}

function __setResult(_result) {
  result = _result;
}

function query(opts) {
  if (result) {
    return Promise.resolve({
      connect: `connect ${opts.host}:${opts.port}`,
      ...result,
    });
  } else {
    return Promise.reject();
  }
}

gamedig.__resetResult = __resetResult;
gamedig.__setResult = __setResult;
gamedig.query = query;

module.exports = gamedig;
