var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();

var rows = undefined;
var fields = undefined;
var query = connection.query({
  sql: 'SELECT ?',
  values: [ 1 ]
});
query.on('error', function (err) {
  throw err;
});
query.on('fields', function (_fields) {
  fields = _fields;
});
query.on('result', function (_rows) {
  rows = [ _rows ];
});

connection.end();

process.on('exit', function() {
  assert.deepEqual(rows, [{1: 1}]);
  assert.equal(fields[0].name, '1');
});
