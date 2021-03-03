'use strict';

const dns = jest.requireActual('dns');

function resolve(hostname, callback) {
  callback(null, ['1.2.3.4']);
}

dns.resolve = resolve;

module.exports = dns;
