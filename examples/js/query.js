'use strict';

const devo = require('@devo/browser-sdk');
const credentials = require('../credentials.json');
const {Grid} = require('ag-grid-community');

const options = {
  "dateFrom": "2018-07-02T11:30:28Z",
  "dateTo": "2018-07-02T11:30:30Z",
  "query": "from siem.logtrust.web.activityAll",
  mapMetadata: false,
  streamMethod: 'Fetch stream'
};

const client = devo.client(credentials);
let rows = [];
let columns = [];
let lockRequest = false;

let agGridTable;

function registerListeners() {
  document.getElementById("from-input").value = options.dateFrom.slice(0, -1);
  document.getElementById("to-input").value = options.dateTo.slice(0, -1);
  document.getElementById("query-text").value = options.query;
  document.getElementById("streamMethod").value = options.streamMethod;
  document.getElementById("responseRowFormat").value =
    options.mapMetadata ? 'Object data' : 'Raw data';

  document.getElementById("responseRowFormat").addEventListener('change', (event) => {
    options.mapMetadata = event.currentTarget.value === 'Object data';
  });
  document.getElementById("from-input").addEventListener('change', (event) => {
    options.dateFrom = new Date(event.currentTarget.value).toISOString();
  });
  document.getElementById("to-input").addEventListener('change', (event) => {
    options.dateTo = new Date(event.currentTarget.value).toISOString();
  });
  document.getElementById("query-text").addEventListener('change', (event) => {
    options.query = event.currentTarget.value;
  });
  document.getElementById("streamMethod").addEventListener('change', (event) => {
    options.streamMethod = event.currentTarget.value;
  });

  document.getElementById("btn_launch").onclick = launchRequest;
  document.getElementById("btn_xslt").onclick = function () {
    download('xlst')
  };
  document.getElementById("btn_csv").onclick = function () {
    download('csv')
  };
  document.getElementById("btn_tsv").onclick = function () {
    download('tsv')
  };
  document.getElementById("btn_raw").onclick = function () {
    download('raw')
  };
  document.getElementById("btn_msgpack").onclick = function () {
    download('msgpack')
  };
  document.getElementById("btn_json").onclick = function () {
    download('json')
  };
}

function download(format) {
  options.format = format;
  client.download(options).catch(error => console.error)
}

function launchRequest() {
  if (!lockRequest) {
    console.log('starting request');
    lockRequest = false; //TODO uncomment
    setLoadingVisible(true);
    showMsg('');
    if (agGridTable) {
      agGridTable.destroy();
      agGridTable = null;
    }
    document.getElementById('myGrid').style.width = '100%';
    document.getElementById('myGrid').style.display = 'none';

    rows = [];
    const start = window.performance.now();
    const streamMethod = options.streamMethod === 'Oboe stream' ?
      'stream' : 'streamFetch';

    client[streamMethod](adjustTimeZoneOffset(options), {
      meta: addHead,
      data: addRow,
      error: (error) => {
        setLoadingVisible(false);
        showError(error);
      },
      done: done(rows, start)
    });
  } else {
    console.error('Request in progress, wait until finish to launch another' +
      ' one');
  }
}

function done(rows, start) {
  return function () {
    const end = window.performance.now();
    const timeSpent = (end - start) / 1000;
    showMsg(`
      received ${rows.length} events in ${timeSpent} seconds<br/>
      Query: ${options.query}<br/>
      From: ${options.dateFrom}<br/>
      To: ${options.dateTo}<br/>
      TimeStamp: ${new Date().toISOString()}<br/>
      Server: ${credentials.url}
    `);

    const eGridDiv = document.querySelector('#myGrid');
    eGridDiv.style.display = 'block';

    const gridOptions = {
      defaultColDef: {
        sortable: true
      },
      columnDefs: columns.map((field, idx) => {
        return {
          headerName: field,
          field: field,
          colId: idx,
          resizable: true,
          sort: field === 'eventdate' ? 'desc' : undefined,
          valueFormatter: (params) => {
            return params.colDef.field === 'eventdate' ?
              new Date(params.value) : params.value;
          },
          valueGetter: function chainValueGetter(params) {
            return !options.mapMetadata ? params.data[params.colDef.colId] :
              params.data[params.colDef.field];
          }
        };
      }),
      rowData: rows
    };

    //Clean data
    // window.row = undefined;

    setLoadingVisible(false);
    agGridTable = new Grid(eGridDiv, gridOptions);
    lockRequest = false;
  };
}

function setLoadingVisible(visible) {
  document.getElementById('lds-roller-wrapper').style.display =
    visible ? "block" : "none";
}

function showError(error) {
  if (error) {
    console.error(error);
    document.getElementById('msg').innerHTML =
      typeof error === 'string' ? error :
        error.jsonBody.error ? error.jsonBody.error : error.jsonBody.msg;
  }
}

function showMsg(msg) {
  console.log(msg);
  document.getElementById('msg').innerHTML = msg;
}

function adjustTimeZoneOffset(options) {
  return Object.assign({}, options, {
    dateFrom: new Date(new Date(options.dateFrom).getTime() +
      (new Date(options.dateFrom).getTimezoneOffset() * 60000))
      .toISOString(),
    dateTo: new Date(new Date(options.dateTo).getTime() +
      (new Date(options.dateTo).getTimezoneOffset() * 60000))
      .toISOString()
  });
}

function addRow(event) {
  rows.push(event);
}

function addHead(event) {

  function compare(a, b) {
    if (a.index > b.index) return 1;
    if (b.index > a.index) return -1;

    return 0;
  }

  columns = Object.keys(event).sort(compare).map((item) => item);
}

module.exports = {
  registerListeners,
  getRows: () => rows,
  columns: () => columns
};
