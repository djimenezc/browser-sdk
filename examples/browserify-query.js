'use strict';

const devo = require('@devo/browser-sdk');
const credentials = require('./credentials.json');

const options = {
  "dateFrom": "2018-07-02T11:00:00Z",
  "dateTo": "2018-07-02T11:30:30Z",
  "query": "from siem.logtrust.web.activityAll",
  returnRaw: false
};

const client = devo.client(credentials);

document.getElementById("from-input").value = options.dateFrom.slice(0, -1);
document.getElementById("to-input").value = options.dateTo.slice(0, -1);
document.getElementById("query-text").value = options.query;

document.getElementById("from-input").addEventListener('change', (event) => {
  options.dateFrom = new Date(event.currentTarget.value).toISOString();
});
document.getElementById("to-input").addEventListener('change', (event) => {
  options.toFrom = new Date(event.currentTarget.value).toISOString();
});

document.getElementById("query-text").addEventListener('change', (event) => {
  options.query = event.currentTarget.value;
});

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

document.getElementById("btn_launch").onclick = function () {
  console.log('starting request');
  setLoadingVisible(true);
  showMsg('');
  if (agGridTable) {
    agGridTable.destroy();
    agGridTable = null;
  }
  document.getElementById('myGrid').style.width= '100%';
  document.getElementById('myGrid').style.display= 'none';

  const start = window.performance.now();
  client.stream(options, {
    meta: addHead,
    data: addRow,
    error: (error) => {
      setLoadingVisible(false);
      showError(error);
    },
    done: done(rows, start)
  });
};
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

function download(format) {
  options.format = format;
  client.download(options).catch(error => console.error)
}

window.rows = [];
window.columns = [];

let agGridTable;

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
    eGridDiv.style.display= 'block';

    const gridOptions = {
      columnDefs: columns.map((e, idx) => {
        return {
          headerName: e,
          field: e,
          colId: idx,
          valueGetter: function chainValueGetter(params) {
            return options.returnRaw ? params.data[params.colDef.colId] :
              params.data[params.colDef.field];
          }
        };
      }),
      rowData: rows
    };

    agGridTable = new agGrid.Grid(eGridDiv, gridOptions);
    setLoadingVisible(false);
  };
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

  window.columns = Object.keys(event).sort(compare).map((item) => item);
}

