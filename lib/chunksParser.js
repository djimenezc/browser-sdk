'use strict';
const partialJsonParser = require('partial-json-parser');

function parse({bufferString, processMeta, processEvent, processError}) {

  const columns = columns ? columns : takeMeta(sValue, callbacks);

  let stringCut = takeEvents(bufferString + sValue);

  if (stringCut.length > 0) {
    if (isNotEnd(stringCut)) {
      if (endsInPartialEvent(stringCut)) {
        stringCut = takeUntilEndOfLastEvent(stringCut);
        bufferString = takeLastPartialEvent(sValue);
      } else {
        bufferString = '';
        stringCut = takeFullEvents(stringCut);
      }
    } else {
      stringCut = takeUntilEnd(stringCut);
    }
    splitToEvents(stringCut, columns, bufferString, callbacks,
      mapMetadata);

    return bufferRest;
  }
}

function takeEvents(stringCut) {
  return stringCut.substring(stringCut.indexOf('[') + 1,
    stringCut.length);
}

function isNotEnd(stringCut) {
  return stringCut.indexOf(']]}}') < 0;
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
    }).filter((e) => e != null);
}

