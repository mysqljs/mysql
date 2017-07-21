var assert = require('assert');
var common = require('../../common');

var pool   = common.createPool({
  connectionLimit      : 1,
  port                 : common.fakeServerPort,
  testOnBorrowInterval : 200
});

var server = common.createFakeServer();
var ping = false;

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    conn.release();

    setTimeout(function() {
      pool.getConnection(function(err) {
        assert.ifError(err);
        assert.equal(ping, true);

        server.destroy();
      });
    }, 300);
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake();

  incomingConnection.on('ping', function() {
    ping = true;
    this._sendPacket(new common.Packets.OkPacket());
    this._parser.resetPacketNumber();
  });
});
