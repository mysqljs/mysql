var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var server     = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT value FROM stuff', function (err) {
    assert.ok(err, 'got err');
    assert.equal(err.code, 'PARSER_READ_PAST_END');
    assert.equal(!!err.fatal, false);
    assert.equal(err.offset, 4);
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
