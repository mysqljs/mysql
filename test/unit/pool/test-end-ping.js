var common = require('../../common');
var assert = require('assert');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool   = common.createPool({
    connectionLimit    : 1,
    port               : server.port(),
    queueLimit         : 5,
    waitForConnections : true
  });

  pool.getConnection(function (err, conn) {
    assert.ifError(err);
    conn.release();

    pool.getConnection(function (err) {
      assert.ok(err);
      assert.equal(err.message, 'Pool is closed.');
      assert.equal(err.code, 'POOL_CLOSED');
    });

    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('ping', function () {
    setTimeout(function () {
      conn.ok();
    }, 100);
  });
});
