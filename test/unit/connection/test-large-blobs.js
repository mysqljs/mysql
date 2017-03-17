var assert     = require('assert');
var Buffer     = require('safe-buffer').Buffer;
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var server     = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('SELECT value FROM blobs', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 6);
    assert.equal(rows[0].value.length, 0);
    assert.equal(rows[1].value.length, 8);
    assert.equal(rows[2].value.length, (Math.pow(2, 16) - 1));
    assert.equal(rows[3].value.length, Math.pow(2, 16));
    assert.equal(rows[4].value.length, (Math.pow(2, 24) - 1));
    assert.equal(rows[5].value.length, Math.pow(2, 24));

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'SELECT value FROM blobs':
        this._sendPacket(new common.Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        this._sendPacket(new common.Packets.FieldPacket({
          catalog    : 'def',
          charsetNr  : common.Charsets.BINARY,
          name       : 'value',
          protocol41 : true,
          type       : common.Types.LONG_BLOB
        }));

        this._sendPacket(new common.Packets.EofPacket());

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc(0));
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc(8, '.'));
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc((Math.pow(2, 16) - 1), '.'));
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc(Math.pow(2, 16), '.'));
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc((Math.pow(2, 24) - 1), '.'));
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedBuffer(Buffer.alloc(Math.pow(2, 24), '.'));
        this._socket.write(writer.toBuffer(this._parser));

        this._sendPacket(new common.Packets.EofPacket());
        this._parser.resetPacketNumber();
        break;
      default:
        this._handlePacketQuery(packet);
        break;
    }
  });
});
