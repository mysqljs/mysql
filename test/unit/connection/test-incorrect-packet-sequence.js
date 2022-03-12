var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err){
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.ping(function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'PROTOCOL_INCORRECT_PACKET_SEQUENCE');
    assert.equal(err.fatal, true);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (connection) {
  connection.handshake();
  connection.on('ping', function () {
    this._sendPacket(new common.Packets.EofPacket());
    this._parser.resetPacketNumber();
  });
});
