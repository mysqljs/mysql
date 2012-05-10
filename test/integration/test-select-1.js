var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();

var rows = undefined;
connection.query('SELECT 1', function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.deepEqual(rows, [{1: 1}]);
});
