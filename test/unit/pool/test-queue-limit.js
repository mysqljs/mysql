var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit    : 1,
  port               : common.fakeServerPort,
  queueLimit         : 1,
  waitForConnections : true
});

var index  = 0;
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var error = null;

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.equal(++index, 1);
    connection.release();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.equal(++index, 2);
    connection.release();

    pool.end(function (err) {
      assert.ifError(err);
      assert.ok(error);
      assert.equal(error.message, 'Queue limit reached.');
      assert.equal(error.code, 'POOL_ENQUEUELIMIT');
      server.destroy();
    });
  });

  pool.getConnection(function (err) {
    error = err;
  });
});
