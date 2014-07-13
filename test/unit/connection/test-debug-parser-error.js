var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({debug: true, port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var messages = [];

  console.log = function (str) {
    if (typeof str === 'string' && str.length !== 0) {
      messages.push(str);
    }
  };

  connection.query('SELECT value FROM stuff', function (err) {
    assert.ok(err, 'got error');
    assert.equal(messages.length, 6);
    assert.deepEqual(messages, [
      '<-- HandshakeInitializationPacket',
      '--> ClientAuthenticationPacket',
      '<-- OkPacket',
      '--> ComQueryPacket',
      '<-- ResultSetHeaderPacket',
      '<-- FieldPacket'
    ]);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'SELECT value FROM stuff':
        this._sendPacket(new common.Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('def');
        this._socket.write(writer.toBuffer(this._parser));
        this._parser.resetPacketNumber();
        break;
      default:
        this._handlePacketQuery(packet);
        break;
    }
  });
});
