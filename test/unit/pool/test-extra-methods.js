var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  testOnBorrow    : false
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function(err, conn) {
    assert.ifError(err);

    assert.equal(conn.isUsed(), true);
    assert.equal(conn.isRemoved(), false);
    var lastUsedTime = conn.getLastUsedTime();

    conn.release();
    assert.equal(conn.isUsed(), false);

    pool.getConnection(function(err, conn) {
      assert.ok(conn.getLastUsedTime() !== lastUsedTime);
      assert.ok(conn.getReuseCount() === 1);

      server.destroy();
    });
  });
});
