var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({debug: true, port: common.fakeServerPort});
var util       = require('util');

var tid    = 0;
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var messages = [];

  console.log = function () {
    var msg = util.format.apply(this, arguments);
    if (String(msg).indexOf('--') !== -1) {
      messages.push(msg.split(' {')[0]);
    }
  };

  connection.query('SELECT value FROM stuff', function (err) {
    assert.ok(err, 'got error');
    assert.equal(messages.length, 6);
    assert.deepEqual(messages, [
      '<-- HandshakeInitializationPacket',
      '--> (1) ClientAuthenticationPacket',
      '<-- (1) OkPacket',
      '--> (1) ComQueryPacket',
      '<-- (1) ResultSetHeaderPacket',
      '<-- (1) FieldPacket'
    ]);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(conn) {
  conn.handshake({ threadId: ++tid });
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
