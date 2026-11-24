var assert = require('assert');
var common = require('../../common');

var pool = common.createPool({port: common.bogusPort, acquireTimeout: 1000});
var ended = false;
var queryErrored = false;

pool.query('SELECT 1', function (err) {
  assert.ok(err);
  assert.equal(err.code, 'POOL_CLOSED');
  queryErrored = true;
});

pool.end(function (err) {
  assert.ifError(err);
  assert.ok(queryErrored);
  ended = true;
});

process.on('exit', function () {
  assert.ok(ended);
});
