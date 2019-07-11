'use strict';

const {getEventFromBuffer, getParsedEvent} = require('./parserUtils.js');

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
    case 'parsed':
      return {
        state: 'parsed',
        bufferString
      };
    case 'parsedError': {
      return {
        state: 'parsedError',
        bufferString
      };
    }
    default: {
      console.error(`state ${state} not supported`);
      return false
    }
  }
}

const ARRAY_SEPARATOR = /]\s*,\s*\[/;

function processEventsState(bufferString, callbacks) {
  let event = null;
  let newBufferString = bufferString;

  let separatorPosition = 1;
  do {
    newBufferString = newBufferString.replace(/^\s*,\s*\[/,'[');
    event = getEventFromBuffer(newBufferString, ARRAY_SEPARATOR, separatorPosition);
    if (event) {
      const eventParsed = getParsedEvent(event[0]);
      if (eventParsed) {
        callbacks.processEvent(eventParsed);
        newBufferString = event[1];
        separatorPosition = 1;
      } else {
        separatorPosition++;
      }
    }
  } while (event);

  const lastEvent = getEventFromBuffer(newBufferString, ']}}');
  let state = 'event';
  if (lastEvent) {
    event = getParsedEvent(lastEvent[0].slice(0, -1));
    if (event) {
      callbacks.processEvent(event);
    }
    state = 'parsed';
    newBufferString = '';
  } else {
    event = getParsedEvent(newBufferString);
    if (event) {
      callbacks.processEvent(event);
      newBufferString = ''
    }
  }

  return {
    state,
    bufferString: newBufferString.trimLeft()
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
      state: 'parsedError',
      bufferString: bufferString
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
