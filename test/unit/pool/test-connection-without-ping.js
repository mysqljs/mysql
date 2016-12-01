var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  pingCheckInterval : 30000
});

var server = common.createFakeServer();
var ping = false;

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    conn.release();
  });

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    assert.equal(ping, false);

    conn.release();
    server.destroy();
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
