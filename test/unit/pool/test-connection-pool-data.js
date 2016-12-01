var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  pingCheckInterval : 3000
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function(err, conn) {
    assert.ifError(err);

    assert.equal(conn._poolData.used, true);
    assert.equal(conn._poolData.removed, false);
    assert.ok(conn._poolData.lastUsedTime > 0);

    conn.release();

    assert.equal(conn._poolData.used, false);
    server.destroy();
  });
});
