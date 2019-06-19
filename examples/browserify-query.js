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

document.getElementById("btn_launch").onclick = function () {
  document.body.style.cursor = 'progress';
  document.getElementById('divTableBody').innerHTML = "";
  const start = window.performance.now();
  client.stream(options , {
    meta: addHead,
    data: addRow,
    error: error => console.error(error),
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

function done(rows, start) {
  return function () {
    document.body.style.cursor = 'auto';
    const end = window.performance.now();
    const timeSpent = (end - start) / 1000;
    console.log(`received ${rows.length} events in ${timeSpent} seconds`)
    const eGridDiv = document.querySelector('#myGrid');
    var gridOptions = {
      columnDefs: columns.map((e, idx) => {
        return {
          headerName: e,
          field: e,
          colId: idx,
          valueGetter: function chainValueGetter(params) {
            return options.returnRaw ? params.data[params.colDef.colId]:
              params.data[params.colDef.field];
          }
        };
      }),
      rowData: rows
    };
    new agGrid.Grid(eGridDiv, gridOptions);
  };
}

function addRow(event) {
  const body = document.getElementById('divTableBody');
  const tbh = document.createElement('div');
  tbh.className = 'divTableRow';
  const cols = Object.keys(event);
  for (let i = 0; i < cols.length; i++) {
    const td = document.createElement('div');
    td.appendChild(document.createTextNode(event[cols[i]]));
    td.className = 'divTableCell';
    tbh.appendChild(td);
  }
  //body.appendChild(tbh);

  rows.push(event);
}

function addHead(event) {
  // const body = document.getElementById('divTableBody');
  // const tbh = document.createElement('div');
  // tbh.className = 'divTableRow divTableHeading';

  // Object.keys(event).forEach(key => {
  //   const td = document.createElement('div');
  //   td.className = 'divTableHead';
  //   td.appendChild(document.createTextNode(
  //     key +
  //     " (" + event[key].type + ")"));
  //   tbh.appendChild(td);
  // });

  function compare(a, b) {
    if (a.index > b.index) return 1;
    if (b.index > a.index) return -1;

    return 0;
  }

  window.columns = Object.keys(event).sort(compare).map((item) => item);
  // body.appendChild(tbh)
}

