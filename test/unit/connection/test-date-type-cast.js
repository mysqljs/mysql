var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var done = after(4, function () {
    server.destroy();
  });

  var conn1 = common.createConnection({
    port     : common.fakeServerPort,
    timezone : 'Z'
  });
  conn1.query('SELECT value FROM date_rows', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.strictEqual(rows[0].value, '0000-00-00');
    assert.strictEqual(rows[1].value, '2000-00-00');
    assert.strictEqual(rows[2].value, '2000-01-00');
    assert.ok(rows[3].value instanceof Date);
    assert.strictEqual(rows[3].value.toISOString(), '2000-01-02T00:00:00.000Z');
    conn1.destroy();
    done();
  });

  var conn2 = common.createConnection({
    dateStrings : true,
    port        : common.fakeServerPort,
    timezone    : 'Z'
  });
  conn2.query('SELECT value FROM date_rows', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.strictEqual(rows[0].value, '0000-00-00');
    assert.strictEqual(rows[1].value, '2000-00-00');
    assert.strictEqual(rows[2].value, '2000-01-00');
    assert.strictEqual(rows[3].value, '2000-01-02');
    conn2.destroy();
    done();
  });

  var conn3 = common.createConnection({
    dateStrings : ['DATE'],
    port        : common.fakeServerPort,
    timezone    : 'Z'
  });
  conn3.query('SELECT value FROM date_rows', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.strictEqual(rows[0].value, '0000-00-00');
    assert.strictEqual(rows[1].value, '2000-00-00');
    assert.strictEqual(rows[2].value, '2000-01-00');
    assert.strictEqual(rows[3].value, '2000-01-02');
    conn3.destroy();
    done();
  });

  var conn4 = common.createConnection({
    dateStrings : ['DATETIME', 'TIMESTAMP'],
    port        : common.fakeServerPort,
    timezone    : 'Z'
  });
  conn4.query('SELECT value FROM date_rows', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.strictEqual(rows[0].value, '0000-00-00');
    assert.strictEqual(rows[1].value, '2000-00-00');
    assert.strictEqual(rows[2].value, '2000-01-00');
    assert.ok(rows[3].value instanceof Date);
    assert.strictEqual(rows[3].value.toISOString(), '2000-01-02T00:00:00.000Z');
    conn4.destroy();
    done();
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'SELECT value FROM date_rows':
        this._sendPacket(new common.Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        this._sendPacket(new common.Packets.FieldPacket({
          catalog    : 'def',
          charsetNr  : common.Charsets.UTF8_GENERAL_CI,
          name       : 'value',
          protocol41 : true,
          type       : common.Types.DATE
        }));

        this._sendPacket(new common.Packets.EofPacket());

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('0000-00-00');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('2000-00-00');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('2000-01-00');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new common.PacketWriter();
        writer.writeLengthCodedString('2000-01-02');
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
