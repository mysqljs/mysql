var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);

    connection.release();
    pool.end(function (err) {
      assert.ifError(err);
      pool.getConnection(function (err, connection) {
        assert.ok(err);
        assert.equal(err.code, 'POOL_CLOSED');
        assert.equal(err.message, 'Pool is closed.');
        assert.ok(!connection);
        server.destroy();
      });
    });
  });
});
