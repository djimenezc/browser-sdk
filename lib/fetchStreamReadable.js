'use strict';

const oboe = require('oboe');
const partialJsonParser = require('partial-json-parser');

module.exports = {
  create: options => new FetchStreamReadable(options),
  STREAMING_FORMAT: 'json/compact',
};


/**
 * Send a request to the Devo API server using the Oboe library.
 */
class FetchStreamReadable {

  constructor(options) {
    this._mapMetadata = options.mapMetadata !== false;
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

    this._request = fetch(options.url, {
      method: options.method,
      withCredentials: true,
      headers: options.headers,
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
      // Create a new response out of the stream
      .then(rs => new Response(rs))
      // Create an object URL for the response
      .then(response => {
        return response.json();
      })
      .then(responseJson => {
        callbacks.done();
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


async function processStream(reader, controller, callbacks, mapMetadata) {
  let chunksCounter = 0;
  let columns = null;
  let notFinishedEvent = '';

  const textDecoder = new TextDecoder("utf-8");

  while (true) {
    // console.log('received chunk', chunksCounter++);
    const {done, value} = await reader.read();
    // When no more data needs to be consumed, break the reading
    if (done) {
      break;
    }
    const sValue = textDecoder.decode(value);

    columns = columns ? columns : takeMeta(sValue, callbacks);

    let stringCut = takeEvents(notFinishedEvent + sValue);

    if (stringCut.length > 0) {
      if (isNotEnd(stringCut)) {
        if (endsInPartialEvent(stringCut)) {
          stringCut = takeUntilEndOfLastEvent(stringCut);
          notFinishedEvent = takeLastPartialEvent(sValue);
        } else {
          notFinishedEvent = '';
          stringCut = takeFullEvents(stringCut);
        }
      } else {
        stringCut = takeUntilEnd(stringCut);
      }
      splitToEvents(stringCut, columns, notFinishedEvent, callbacks,
        mapMetadata);
    }

    // Enqueue the next data chunk into our target stream
    controller.enqueue(value);
  }
  // Close the stream
  controller.close();
  reader.releaseLock();
}

function takeEvents(stringCut) {
  return stringCut.substring(stringCut.indexOf('[') + 1,
    stringCut.length);
}

function isNotEnd(stringCut) {
  return stringCut.indexOf(']]}}')  < 0;
}

function endsInPartialEvent(stringCut) {
  return stringCut[stringCut.length - 1] !== ']';
}

function takeUntilEndOfLastEvent(stringCut) {
  return stringCut.substring(0, stringCut.lastIndexOf('],['));
}

function takeLastPartialEvent(string) {
  return string.substring(string.lastIndexOf('['), string.length);
}

function takeFullEvents(stringCut) {
  return stringCut.substring(0, stringCut.lastIndexOf(']'));
}

function takeUntilEnd(stringCut) {
  return stringCut.substring(0, stringCut.indexOf(']]}}'));
}

function takeMeta(string, callbacks) {
  const jsonObject =
    partialJsonParser(string.substring(0, string.lastIndexOf('[') - 6));
  let columns;
  if (jsonObject.object.m) {

    // console.log(jsonObject);
    columns = Object.keys(jsonObject.object.m);

    readMeta(jsonObject.object.m, callbacks.meta);
    return columns;
  }
}

function splitToEvents(stringCut, columns, notFinishedEvent, callbacks,
  mapMetadata) {
   stringCut.split('],[')
     .map((e, idx) => {
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
    }).filter((e) => {
      e != null;
    });
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
