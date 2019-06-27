'use strict';

const partialJsonParser = require('partial-json-parser');
const {detect} = require('detect-browser');

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

function isNode() {
  const browser = detect();
  return browser.name === 'node';
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
  headersWrapped.append('Access-Control-Allow-Origin', '*');

  return isNativeStreamFetchSupported() ? headers: headersWrapped ;
}


/**
 * Send a request to the Devo API server using the Oboe library.
 */
class FetchStreamReadable {

  constructor(options) {
    this._columns = null;
    this._failed = false;
    this._msg = null;
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
          async start(controller) {
            let chunksCounter = 0;
            const textDecoder = new TextDecoder('utf-8');
            let columns;
            let notFinishedEvent = '';
            // eslint-disable-next-line no-constant-condition
            while (true) {
              console.log('received chunk', chunksCounter++);
              const {done, value} = await reader.read();
              // When no more data needs to be consumed, break the reading
              if (done) {
                break;
              }
              const string = textDecoder.decode(value);
              if (chunksCounter === 1) {
                const jsonObject = partialJsonParser(string);
                if (jsonObject.object.m) {

                  console.log(jsonObject);
                  columns = Object.keys(jsonObject.object.m);

                  readMeta(jsonObject.object.m, callbacks.meta);
                }
              } else {
                let stringCut = notFinishedEvent + string;
                stringCut = stringCut.substring(stringCut.indexOf('[') + 1, stringCut.length);

                if (stringCut.indexOf(']]}}') < 0) {
                  if (string[string.length - 1] !== ']') {
                    stringCut = stringCut.substring(0, stringCut.lastIndexOf('],['));
                    notFinishedEvent = string.substring(string.lastIndexOf('['), string.length);
                  } else {
                    notFinishedEvent = '';
                    stringCut = stringCut.substring(0, stringCut.lastIndexOf(']'));
                  }
                } else {
                  stringCut = stringCut.substring(0, stringCut.indexOf(']]}}'));
                }

                stringCut.split('],[').map((e, idx) => {
                  // console.log('Processing event', idx);
                  try {
                    const event = JSON.parse('[' + e + ']');
                    // console.log('event: ', e);
                    if (e === '') {
                      return null;
                    } else {
                      return readRow(event, columns, callbacks.data, mapMetadata);
                    }

                  } catch (error) {
                    notFinishedEvent = '[' + e;
                    // console.log(`partial event kept for the next chunk: ${e}`);
                  }
                })
                  .filter((e) => e != null);

                // console.log(eventsArray);
              }

              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
            }
            // Close the stream
            controller.close();
            reader.releaseLock();
          }
        })
      })
      // Create a new response out of the stream
      .then(rs => new Response(rs))
      // Create an object URL for the response
      .then(response => {
        console.log('waiting for response to be resolve');
        return response.json();
      })
      .then(responseJson => {
        callbacks.done();
        return responseJson;
      })
      // // Update image
      // .then(url => image.src = url)
      .catch(console.error);

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

/**
 * Read meta data.
 *
 * @param {Object} event Meta event.
 * @param {function(*)} callback Optional function to send the event.
 * @private
 */
function readMeta(event, callback) {
  if (callback) {
    callback(event);
  }
}

/**
 * Read a data event, return an object with a single row.
 */
function readRow(event, columns, callback, mapMetadata) {
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
