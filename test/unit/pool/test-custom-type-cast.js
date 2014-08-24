var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  port     : common.fakeServerPort,
  typeCast : typeCast
});
var server = common.createFakeServer();

function typeCast(field, next) {
  if (field.type !== 'TINY') {
    return next();
  }

  var val = field.string();

  if (val === null) {
    return null;
  }

  return (Number(val) > 0);
}

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.query('SELECT value FROM typecast', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 3);
    assert.strictEqual(rows[0].value, false);
    assert.strictEqual(rows[1].value, true);
    assert.strictEqual(rows[2].value, null);

    pool.end(function(err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'SELECT value FROM typecast':
        this._sendPacket(new common.Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        this._sendPacket(new common.Packets.FieldPacket({
          catalog    : 'def',
          charsetNr  : common.Charsets.UTF8_GENERAL_CI,
          name       : 'value',
          protocol41 : true,
          type       : common.Types.TINY
        }));

        this._sendPacket(new common.Packets.EofPacket());

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('0');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('1');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString(null);
        this._socket.write(writer.toBuffer(this._parser));

        this._sendPacket(new common.Packets.EofPacket());
        this._parser.resetPacketNumber();
        break;
      default:
        this._handleQueryPacket(packet);
        break;
    }
  });
});
