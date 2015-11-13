var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('quit', function () {
    conn._sendPacket(new common.Packets.OkPacket());
    conn._parser.resetPacketNumber();
  });
});
