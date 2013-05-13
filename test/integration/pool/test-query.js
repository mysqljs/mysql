var common     = require('../../common');
var assert     = require('assert');
var pool       = common.createPool();

pool.query('SELECT 1', function (err, _rows, _fields) {
  if (err) throw err;

  rows = _rows;
  fields = _fields;

  pool.end();
});

process.on('exit', function () {
  assert.deepEqual(rows, [{1: 1}]);
  assert.equal(fields[0].name, '1');
});
