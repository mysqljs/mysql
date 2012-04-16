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
var bestRowsPerSecond = 0;
var rows = 0;

function query() {
  firstSelect = firstSelect || Date.now();

  client.query('SELECT * FROM posts', function(err, results) {
    if (err) throw err;

    rows += results;
    if (rows < rowsPerRun) {
      query();
      return;
    }

    var duration = (Date.now() - firstSelect) / 1000;
    var rowsPerSecond = rows / duration;;

    if (rowsPerSecond > bestRowsPerSecond) {
      bestRowsPerSecond = rowsPerSecond;
      console.log('%d rows / second', rowsPerSecond.toFixed(2));
    } else {
      console.log('.');
    }

    rows        = 0;
    firstSelect = null;

    setTimeout(query, 1000);
  });
};
