var common     = require('../test/common');
var client     = common.createConnection();
var rowsPerRun = 100000;

client.connect(function(err) {
  if (err) throw err;

  client.query('USE node_mysql_test', function(err, results) {
    if (err) throw err;

    query();
  });
});

var firstSelect;
var rows = 0;

console.error('Benchmarking rows per second in hz:');

function query() {
  firstSelect = firstSelect || Date.now();

  client.query('SELECT * FROM posts', function(err, results) {
    if (err) throw err;

    rows += results.length;
    if (rows < rowsPerRun) {
      query();
      return;
    }

    var duration = (Date.now() - firstSelect) / 1000;
    var hz = Math.round(rows / duration);

    console.log(hz);

    rows        = 0;
    firstSelect = null;

    query();
  });
};
