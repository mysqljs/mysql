var common     = require('../../common');
var assert     = require('assert');
var pool       = common.createPool();
var Query      = require('../../../lib/protocol/sequences/Query');

var poolQuery  = pool.query('SELECT 1', function (err, _rows, _fields) {
  if (err) throw err;

  rows = _rows;
  fields = _fields;

  // Should work without error
  pool.query('SELECT SQL_ERROR');

  process.nextTick(function () {
    pool.end();
  });
});

process.on('exit', function () {
  assert(poolQuery instanceof Query);
  assert.deepEqual(rows, [{1: 1}]);
  assert.equal(fields[0].name, '1');
});
