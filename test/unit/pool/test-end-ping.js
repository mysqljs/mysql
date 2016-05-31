var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool({
  connectionLimit    : 1,
  port               : common.fakeServerPort,
  queueLimit         : 5,
  waitForConnections : true
});

var conn1Err  = null;
var conn2Err  = null;
var poolEnded = false;
var server    = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, conn) {
    assert.ifError(err);
    conn.release();

    pool.getConnection(function (err, conn) {
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
      conn._sendPacket(new common.Packets.OkPacket());
      conn._parser.resetPacketNumber();
    }, 100);
  });
});
