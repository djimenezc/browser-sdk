'use strict';

require('should');
const forEach = require('mocha-each');
const {spy, assert} = require('sinon');

const {parse} = require('../lib/chunksParser.js');
const {activityAll, genericError} = require('./response1.js');

const callbacks = {
  processMeta: spy(),
  processEvent: spy(),
  processError: spy()
};

describe('ChunkParser', () => {

  beforeEach(function () {
    Object.values(callbacks).forEach((fn) => fn.resetHistory())
  });

  forEach([
    [
      'return meta, events and state parsed',
      activityAll.toString(),
      'idle',
      {
        callbacks: {
          'processMeta': 1,
          'processEvent': 15
        },
        finalState: 'parsed',
        bufferString: ''
      }
    ],
    [
      'return just meta',
      activityAll.substring(0, 1000),
      'idle',
      {
        callbacks: {
          'processMeta': 1,
          'processEvent': 0
        },
        finalState: 'event',
        bufferString: activityAll.substring(995, 1000)
      }
    ],
    [
      'return error parsed and stated parsed',
      genericError.toString(),
      'idle',
      {
        callbacks: {
          'processError': 1
        },
        finalState: 'parsed',
        bufferString: genericError.toString()
      }
    ]
  ])
    .it('should %s', (message, bufferString, initialState, expected) => {

      const {
        finalState, callbacks: callbacksExpected,
        bufferString: bufferStringExpected
      } = expected;

      const result = parse({
        status: {bufferString, state: initialState},
        callbacks
      });

      result.state.should.be.equal(finalState);
      result.bufferString.should.be.equal(bufferStringExpected);
      Object.entries(callbacksExpected).forEach((entry) => {
        assert.callCount(callbacks[entry[0]], entry[1]);
      });

    });
});

