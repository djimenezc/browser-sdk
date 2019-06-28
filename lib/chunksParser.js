'use strict';

function parse({status, callbacks}) {

  let {state, bufferString} = status;

  if (state === 'idle') {
    state = processIdleState(bufferString);
  }

  switch (state) {
    case 'meta':
      return processMetaState(bufferString, callbacks);
    case 'event':
      return processEventsState(bufferString, callbacks);
    case 'error':
      return processErrorState(bufferString, callbacks);
    default: {
      console.error(`state ${state} not supported`);
      return false
    }
  }
}

function getEventFromBuffer(bufferString, separator = '],[') {
  const index = bufferString.indexOf(separator);
  return (index !== -1) ?
    [bufferString.slice(0, index + 1), bufferString.slice(index + 2)] :
    null;
}

const getParsedEvent = (x) =>
  JSON.parse(x.replace('undefined', 'null'));

function processEventsState(bufferString, callbacks) {
  let event = null;
  let newBufferString = bufferString;

  do {
    event = getEventFromBuffer(newBufferString);
    if (event) {
      callbacks.processEvent(getParsedEvent(event[0]));
      newBufferString = event[1];
    }
  } while (event);

  const lastEvent = getEventFromBuffer(newBufferString, ']}}');
  if (lastEvent) {
    callbacks.processEvent(getParsedEvent(lastEvent[0].slice(0, -1)));
    return {
      state: 'parsed',
      bufferString: ''
    }
  }

  return {
    state: 'event',
    bufferString: newBufferString
  };
}

function processMetaState(bufferString, callbacks) {

  const eventsStartIndex = bufferString.indexOf('},"d":[');
  const metaStartIndex = 0;
  let result = {
    state: 'meta',
    bufferString
  };

  if (eventsStartIndex !== -1) {
    const metaParsed = JSON.parse(
      bufferString.slice(metaStartIndex, eventsStartIndex) + '}}}');
    callbacks.processMeta(metaParsed.object.m);
    return processEventsState(bufferString.slice(eventsStartIndex + 7), callbacks);
  }

  return result;
}

function errorComplete(bufferString) {
  try {
    return JSON.parse(bufferString);
  } catch (e) {
    return null;
  }
}

function processErrorState(bufferString, callbacks) {

  const errorParsed = errorComplete(bufferString);

  if (errorParsed) {
    callbacks.processError(errorParsed);
    return {
      state: 'parsed',
      bufferString: ''
    };
  } else {
    return {
      state: 'error',
      bufferString
    };

  }
}

const processIdleState = (bufferString) =>
  checkIsMeta(bufferString) ? 'meta' : 'error';

function checkIsMeta(str) {
  return str.startsWith('{"msg":""');
}

module.exports = {
  parse
};
