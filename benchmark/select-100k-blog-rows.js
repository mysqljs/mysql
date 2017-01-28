var common     = require('../test/common');
var client     = common.createConnection({typeCast: false});
var rowsPerRun = 100000;

client.connect(function(err) {
  if (err) throw err;

  client.query('USE node_mysql_test', function(err) {
    if (err) throw err;

    selectRows();
  });
});

var firstSelect;
var rowCount = 0;

console.error('Benchmarking rows per second in hz:');

function selectRows() {
  firstSelect = firstSelect || Date.now();

  client.query('SELECT * FROM posts', function(err, rows) {
    if (err) throw err;

    rowCount += rows.length;
    if (rowCount < rowsPerRun) {
      selectRows();
      return;
    }

    var duration = (Date.now() - firstSelect) / 1000;
    var hz = Math.round(rowCount / duration);

    console.log(hz);

    rowCount    = 0;
    firstSelect = null;

    selectRows();
  });
}
