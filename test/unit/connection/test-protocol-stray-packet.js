var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.on('error', function (err) {
    assert.equal(err.code, 'PROTOCOL_STRAY_PACKET');
    assert.equal(err.fatal, true);
    connection.destroy();
    server.destroy();
  });

  connection.query('SELECT 1', assert.ifError);
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    var resetPacketNumber = this._parser.resetPacketNumber;

    // Prevent packet number from being reset
    this._parser.resetPacketNumber = function () {};
    this._handleQueryPacket(packet);

    this._parser.resetPacketNumber = resetPacketNumber;
    this._sendPacket(new common.Packets.ResultSetHeaderPacket({
      fieldCount: 1
    }));
  });
});
