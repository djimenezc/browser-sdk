'use strict';

const {detect} = require('detect-browser');
const {parse} = require('./chunksParser.js');

function isNativeStreamFetchSupported() {
  const browser = detect();
  const {name, version} = browser;

  // if (browser) {
  //   console.log(name);
  //   console.log(version);
  //   console.log(os);
  // }
  const majorVersion = parseInt(version.split('.')[0], 10);

  return (name === 'chrome' && majorVersion >= 42) ||
    (name === 'firefox' && majorVersion >= 65);
}

module.exports = {
  create: options => new FetchStreamReadable(options),
  STREAMING_FORMAT: 'json/compact',
  processStream
};

function buildHeaders(headers) {
  const {Headers} = require('fetch-readablestream/lib/polyfill/Headers.js');

  const headersWrapped = new Headers();

  Object.entries(headers).forEach(
    (entry) => headersWrapped.append(entry[0], entry[1]));

  return isNativeStreamFetchSupported() ? headers : headersWrapped;
}


/**
 * Send a request to the Devo API server using the Oboe library.
 */
class FetchStreamReadable {

  constructor(options) {
    this._mapMetadata = options.mapMetadata !== false;
    this._fetchMethod = isNativeStreamFetchSupported() ? window.fetch.bind(window)
      : require('fetch-readablestream');

    if (typeof ReadableStream === 'undefined') {
      console.log('Loading ReadableStream');
      window.ReadableStream = require('web-streams-polyfill').ReadableStream;
    }
  }

  /**
   * Make a streaming query to the Devo API.
   *
   * @param {Object} options An object with method, body and headers.
   * @param {Object} callbacks An object with attributes for callbacks:
   *  - meta: receives headers.
   *  - data: receives each row of data.
   *  - error: receives any errors.
   *  - done: optional, invoked after finishing parsing.
   */
  stream(options, callbacks) {

    this._request = this._fetchMethod(options.url, {
      method: options.method,
      withCredentials: true,
      headers: buildHeaders(options.headers),
      body: JSON.stringify(options.body)
    })
      .then(response => response.body)
      .then(rs => {
        const reader = rs.getReader();
        return new ReadableStream({
          start() {
            processStream(reader, callbacks);
          }
        })
      })
      .catch((e) => console.error('error requesting:', e));

    return this;
  }

  /**
   * Abort an ongoing request.
   */
  abort() {
    this._request.abort();
    return this;
  }

}

async function processStream(reader, callbacks) {
  // let chunksCounter = 0;
  let status = {
    bufferString: '',
    state: 'idle'
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const {done, value} = await reader.read();
    // console.log('received chunk', chunksCounter++);
    // When no more data needs to be consumed, break the reading
    if (done) {
      break;
    }

    const sValue = String.fromCharCode.apply(null, value);

    status = parse({
      status: {...status, bufferString: status.bufferString + sValue},
      callbacks: {
        processMeta: callback(callbacks.meta),
        processEvent: callback(callbacks.data),
        processError: callback(callbacks.error)
      }
    });
  }

  callbacks.done();
  reader.releaseLock();

  return status;
}

/**
 * Callback call checker.
 *
 * @param {function(*)} callback Optional function to send the event.
 * @private
 */
function callback(callback) {
  return function (event) {
    if (callback) {
      callback(event);
    }
  }
}
