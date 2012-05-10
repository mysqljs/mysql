console.log('TOP');

var common     = require('../common');
var connection = common.createConnection({debug: true});
var assert     = require('assert');

connection.connect();

var rows = undefined;
connection.query('SELECT 1', function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  console.log('EXIT', rows);
  assert.deepEqual(rows, [{1: 1}]);
});

console.log('BOTTOM');
