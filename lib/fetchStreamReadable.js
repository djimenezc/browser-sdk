'use strict';

const {detect} = require('detect-browser');
const {parse} = require('./chunksParser.js');

function isNativeStreamFetchSupported() {
  const browser = detect();
  const {name, version, os} = browser;

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
};

function buildHeaders(headers) {
  const {Headers} = require('fetch-readablestream/lib/polyfill/Headers.js');

  const headersWrapped = new Headers();

  Object.entries(headers).forEach(
    (entry) => headersWrapped.append(entry[0], entry[1]));
  // headersWrapped.append('Access-Control-Allow-Origin', '*');

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
    const mapMetadata = this._mapMetadata;

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
          start(controller) {
            processStream(reader, controller, callbacks, mapMetadata);
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

async function processStream(reader, controller, callbacks, mapMetadata) {
  // let chunksCounter = 0;
  let columns = null;
  let bufferString = '';

  const textDecoder = new TextDecoder("utf-8");

  while (true) {
    const {done, value} = await reader.read();
    // console.log('received chunk', chunksCounter++);
    // When no more data needs to be consumed, break the reading
    if (done) {
      break;
    }

    const sValue = textDecoder.decode(value);

    bufferString = parse(bufferString + sValue, processMeta(callbacks.me), processEvent, processError);
  }

  callbacks.done();
  reader.releaseLock();
}

/**
 * Read meta data.
 *
 * @param {Object} event Meta event.
 * @param {function(*)} callback Optional function to send the event.
 * @private
 */
function processMeta(callback) {
  return function (event) {
    if (callback) {
      callback(event);
    }
  }
}

/**
 * Read a data event, return an object with a single row.
 */

function processEvent(columns, callback, mapMetadata) {
  return function (event) {
    if (mapMetadata === false) {
      callback(event);
      return event;
    } else {
      let data = event;
      data = {};
      columns.forEach((key, index) => data[key] = event[index]);

      if (callback) {
        callback(data);
      }
      return data;
    }
  }
}

function processError() {

}
