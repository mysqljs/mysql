var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.bogusPort
});

pool.getConnection(function (err, conn) {
  assert.ok(err);
  assert.ok(err.fatal);
  assert.equal(err.code, 'ECONNREFUSED');

  pool.end(function (err) {
    assert.ifError(err);
  });
});
