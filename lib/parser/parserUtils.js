'use strict';

const getParsedEvent = (x) => {
  try {
    return JSON.parse(x.replace('undefined', 'null'));
  } catch (e) {
    // console.error(e, x);
    return false;
  }
};

function getEventFromBuffer(bufferString, separator, separatorPosition = 1) {
  const index = nthIndex(bufferString, separator, separatorPosition);
  let result = null;
  if (index !== -1) {
    result = [bufferString.slice(0, index + 1),
      bufferString.slice(index + 1).trimLeft().slice(1).trimLeft()];
  }

  return result;
}

function nthIndex(str, pattern, index) {
  const L = str.length;
  let i = -1;
  while (index-- && i++ < L) {
    i = regexIndexOf(str, pattern, i);
    if (i < 0) break;
  }
  return i;
}

function numberOccurrences(str, pattern) {
  return str.split(pattern).length - 1;
}

function getAllPosition(str, pattern) {

  const positions = [];
  const nOccurrences = numberOccurrences(str, pattern);
  let i = 0;

  while (i < nOccurrences) {
    i++;
    positions.push(nthIndex(str, pattern, i));
  }

  return positions;
}

function regexIndexOf(text, re, i = 0) {
  const indexInSuffix = text.slice(i).search(re);
  return indexInSuffix < 0 ? indexInSuffix : indexInSuffix + i;
}

module.exports = {
  getEventFromBuffer,
  getParsedEvent,
  nthIndex,
  getAllPosition,
  numberOccurrences,
  regexIndexOf
};
