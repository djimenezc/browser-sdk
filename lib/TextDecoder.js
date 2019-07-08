'use strict';

const encoding = require('text-encoding');

if (typeof TextEncoder === 'undefined') {

  // eslint-disable-next-line no-global-assign
  global.TextDecoder = encoding.TextDecoder;
  if (typeof window !== 'undefined') {
    window.TextDecoder = global.TextDecoder;
  }
}
