'use strict';

require('should');
global.fetch = require('node-fetch');

const clientLib = require('../lib/client.js');

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

function isObject(o) {
  return Object.getPrototypeOf(o) === isObject.OBJECTPROTO;
}

isObject.OBJECTPROTO = Object.getPrototypeOf({});

describe('Browser client with web support', () => {

  it('queries using fetchStreamReadable method', (doneMocha) => {

    const client = clientLib.create(credentials2);
    client.streamFetch(options2, {
      done: () => {
        doneMocha();
      },
      meta: (meta) => meta,
      data: (event) => event,
      // meta: (meta) => console.log('META', meta),
      // data: (event) => console.log('EVENT', event),
      error: (e) => console.error(e)
    });
  });

});




