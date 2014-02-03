var common     = require('../../common');
var connection = common.createConnection({connectTimeout: 1000});
var assert     = require('assert');

connection.connect();

var connectErr;
var rows = undefined;
var fields = undefined;
connection.query('SELECT SLEEP(3)', function(err, _rows, _fields) {
  connectErr = err;
  rows = _rows;
  fields = _fields;
});

connection.end();

process.on('exit', function() {
  assert.ifError(connectErr);
  assert.deepEqual(rows, [{'SLEEP(3)': 0}]);
  assert.equal(fields[0].name, 'SLEEP(3)');
});
