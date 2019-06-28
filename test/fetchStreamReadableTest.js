'use strict';

require('should');
const forEach = require('mocha-each');
const {spy, assert} = require('sinon');

const {processStream} = require('../lib/fetchStreamReadable.js');
const {activityAll, genericError} = require('./response1.js');

const callbacks = {
  meta: spy(),
  data: spy(),
  error: spy(),
  done: spy()
};

function str2ArrayBuffer(str) {
  const buf = new ArrayBuffer(str.length ); // 2 bytes for each char
  const bufView = new Uint8Array(buf);
  let i = 0, strLen = str.length;
  for (; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function* bufferRead(buffer) {
  console.log('read chunk');
  for (const chunk of buffer) {
    yield new Uint8Array(str2ArrayBuffer(chunk));
  }
}

class FakeReader {
  constructor(str, breakpoints = []) {
    let from = 0;
    this.buffer = breakpoints.map((to) => {
      const result = str.slice(from, to);
      from = to;
      return result;
    });
    this.buffer.push(str.substring(from));
    this.generator = bufferRead(this.buffer);
  }

  static of(...params) {
    return new FakeReader(...params);
  }

  read() {
    return new Promise((resolve) => {
      const chunk = this.generator.next();
      resolve(chunk);
      return chunk;
    });
  }

  releaseLock() {
  }
}

describe('fetchStreamReadable', () => {

  beforeEach(function () {
    Object.values(callbacks).forEach((fn) => fn.resetHistory())
  });

  forEach([
    [
      'return meta, events and state parsed',
      activityAll.toString(),
      [200, 500, 1000, 10000],
      {
        callbacks: {
          meta: 1,
          data: 15,
          done: 1
        },
        finalState: 'parsed',
        bufferString: ''
      }
    ],
    [
      'return just meta',
      activityAll.substring(0, 1000),
      [200, 500, 700],
      {
        callbacks: {
          meta: 1,
          data: 0,
          done: 1
        },
        finalState: 'event',
        bufferString: activityAll.substring(995, 1000)
      }
    ],
    [
      'return error parsed and stated parsed',
      genericError.toString(),
      [200, 500, 1000, 10000],
      {
        callbacks: {
          error: 1,
          done: 1
        },
        finalState: 'parsed',
        bufferString: genericError.toString()
      }
    ]
  ])
    .it('should %s', async (message, bufferString, breakpoints, expected) => {

      const {
        callbacks: callbacksExpected,
        bufferString: bufferStringExpected,
        finalState
      } = expected;

      const result = await processStream(FakeReader.of(bufferString, breakpoints), callbacks);

      result.bufferString.should.be.equal(bufferStringExpected);
      result.state.should.be.equal(finalState);
      Object.entries(callbacksExpected).forEach((entry) => {
        assert.callCount(callbacks[entry[0]], entry[1]);
      });

    });
});

