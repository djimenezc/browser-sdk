'use strict';

require('should');
const http = require('http');
global.fetch = require('node-fetch');

const clientLib = require('../lib/client.js');
const forEach = require('mocha-each');

const credentials = {
  url: 'http://127.0.0.1:3331/search',
  apiKey: 'key',
  apiSecret: 'secret',
};
const credentials2 = {
  url: 'https://apiv2-eu.devo.com/search',
  apiKey: 'Aj2TszfxlRPrNXPfyzKa8BFM6DYlGcka',
  apiSecret: 'i3eA1mdkwJCauYfvunKMgeJFtFup8hLO'
};
const nowIsoString = new Date().toISOString();
const now = new Date();
now.setMinutes(now.getMinutes() - 1);

const options2 = {
  'dateFrom': now.toISOString(),
  'dateTo': nowIsoString,
  'query': 'from siem.logtrust.web.activityAll',
};
const client = clientLib.create(credentials);
const QUERY = 'from demo.ecommerce.data select eventdate,protocol,statusCode,method';
const TABLE = 'demo.ecommerce.data';
const from = new Date(Date.now() - 60 * 1000);
const to = new Date();

function isObject(o) {
  return Object.getPrototypeOf(o) === isObject.OBJECTPROTO;
}

isObject.OBJECTPROTO = Object.getPrototypeOf({});

describe('Browser client', () => {

  it('sends simple query', async () => {
    const options = {
      dateFrom: from,
      dateTo: to,
      query: QUERY,
    };
    const server = new TestServer({
      contentType: 'json', response: {
        object: [1, 2],
      }
    });
    await server.start(3331);
    const result = await client.query(options);
    result.object.length.should.be.a.Number();
    (server.getError() === null).should.be.true();
    server.getUrl().should.equal('/search/query');
    server.stop()
  });

  it('sends web.activty.all query with a lot of events query', async () => {
    const client = clientLib.create(credentials2);
    const result = await client.query(options2);
    result.object.length.should.be.greaterThan(0);
    result.object.length.should.be.a.Number();
  });

  forEach([true, false])
    .it('sends web.activty.all query with a lot of events streaming rawConfig %s',
      (rawData, doneMocha) => {
        const client =
          clientLib.create(Object.assign({}, credentials2, {rawData}));

        const data = [];
        let meta;

        return client.stream(options2, {
          meta: (e) => {
            // console.log('meta:', e);
            meta = e;
          },
          data: (e) => {
            data.push(e);
          }, //console.log('row:', e),
          error: error => console.error(error),
          done: () => {
            // console.log('END stream');
            data.length.should.be.greaterThan(0);
            meta.should.not.be.null();
            doneMocha();
          },
        });

      });

  it('downloads raw query', async () => {
    const options = {
      dateFrom: from,
      dateTo: to,
      query: QUERY,
      format: 'raw',
    };
    const server = new TestServer({contentType: 'text', response: 'pepito\n'});
    await server.start(3331);
    const result = await client.query(options);
    result.length.should.be.a.Number();
    server.stop()
  });

  it('queries in streaming mode', async () => {
    const options = {
      dateFrom: from,
      dateTo: to,
      query: QUERY,
    };
    const server = new TestServer({contentType: 'json', response: {}});
    await server.start(3331);
    await stream(options);
    return server.stop()
  });

  it('queries using fetchStreamReadable method', async (doneMocha) => {
    global.XMLHttpRequest = require('xhr2');
    global.xhr = new XMLHttpRequest();
    global.ReadableStream = require('web-streams-polyfill/ponyfill/es6').ReadableStream;

    const client = clientLib.create(credentials2);
    client.streamFetch(options2, {
      done: doneMocha,
      meta: () => console.log(1),
      data: () => console.log(1),
      error: () => console.error(2)
    });
    // result.object.length.should.be.greaterThan(0);
    // result.object.length.should.be.a.Number();
  });

  it('table schema (table exists)', async () => {
    const object = [
      {
        fieldName: 'eventdate',
        type: 'timestamp'
      },
      {
        fieldName: 'clientIpAddress',
        type: 'ip4'
      }
    ];
    const server = new TestServer({
      contentType: 'json',
      response: {
        object,
      }
    });
    await server.start(3331);
    const result = await client.table(TABLE);
    const isEqual = JSON.stringify(result.object) === JSON.stringify(object);
    isEqual.should.be.exactly(true);
    server.stop();
  });

  forEach([[
    'event is an object'
  ]])
    .it('queries in streaming mode - event is an object', done => {
      const options = {
        dateFrom: from,
        dateTo: to,
        query: QUERY,
      };
      const server = new TestServer({
        contentType: 'json',
        response: {
          object: {
            m: {colA: {index: 0, type: 'int4'}},
            d: [[0], [1]]
          }
        }
      });
      let doDone = false;
      server.start(3331)
        .then(() => {
          const cli = client.stream(options, {
            meta: () => null,
            data: (d) => {
              if (doDone === true) return;
              isObject(d) ? (doDone = true) && done() : done(new Error('Data' +
                ' should be an object'));
              cli.abort();
              server.stop();
            },
            error: done
          });
        })
        .catch(done);
    });

//   it('queries in streaming mode - event is an array', done => {
//     const options = {
//       dateFrom: from,
//       dateTo: to,
//       query: QUERY,
//       mapMetadata: false,
//     };
//     let doDone = false;
//
//     const server = new TestServer({
//       contentType: 'json',
//       response: {
//         object: {
//           m: {colA: {index: 0, type: 'int4'}},
//           d: [[0], [1]]
//         }
//       }
//     });
//     server.start(3331)
//       .then(() => {
//         const cli = client.stream(options, {
//           meta: () => null,
//           data: (d) => {
//             if (doDone === true) return;
//             Array.isArray(d) ? (doDone = true) && done() : done(new Error('Data should be an array'));
//             cli.abort();
//             server.stop();
//           },
//           error: done
//         })
//       }).catch(done);
//   });
});

class TestServer {
  constructor(options) {
    this._socket = null;
    this._error = null;
    if (typeof options.response == 'object') {
      this._response = JSON.stringify(options.response)
    } else {
      this._response = options.response
    }
    this._server = http.createServer(socket => {
      this._socket = socket;
      this._socket.on('error', error => this._storeError(error))
    });
    this._server.on('error', error => this._storeError(error));
    this._server.on('request', (request, response) => {
      this._url = request.url;
      response.setHeader('content-type', options.contentType || 'text');
      response.end(this._response)
    });
    this._server.unref()
  }

  getError() {
    return this._error
  }

  getUrl() {
    return this._url
  }

  start(port) {
    return new Promise(ok => this._server.listen(port, ok))
  }

  stop() {
    this._server.close()
  }

  _storeError(error) {
    console.error('Error %s', error);
    this._error = error
  }
}

function stream(options) {
  return new Promise((ok, ko) => {
    client.stream(options, {
      meta: () => null,
      data: () => null,
      error: ko,
      done: ok,
    });
  })
}

