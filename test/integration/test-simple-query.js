var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');
var rows       = undefined;

connection.connect(function(err) {
  if (err) throw err;

  connection.query('SELECT 1 = 1', function(err, _rows) {
    if (err) throw err;

    rows = _rows;

    client.end();
  });
});

process.on('exit', function() {
  assert.deepEqual(rows, [{1: 1}]);
});

