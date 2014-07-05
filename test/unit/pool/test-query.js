var assert       = require('assert');
var common       = require('../../common');
var Charsets     = require(common.lib + '/protocol/constants/charsets');
var Errors       = require(common.lib + '/protocol/constants/errors');
var Packets      = require(common.lib + '/protocol/packets');
var PacketWriter = require(common.lib + '/protocol/PacketWriter');
var pool         = common.createPool({port: common.fakeServerPort});
var server       = common.createFakeServer();
var Types        = require(common.lib + '/protocol/constants/types');

server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  pool.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['1'], 1);

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
      case 'SELECT 1':
        this._sendPacket(new Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        this._sendPacket(new Packets.FieldPacket({
          catalog    : 'def',
          charsetNr  : Charsets.UTF8_GENERAL_CI,
          name       : '1',
          protocol41 : true,
          type       : Types.LONG
        }));

        this._sendPacket(new Packets.EofPacket());

        var writer = new PacketWriter();
        writer.writeLengthCodedString('1');
        this._socket.write(writer.toBuffer(this._parser));

        this._sendPacket(new Packets.EofPacket());
        this._parser.resetPacketNumber();
        break;
      default:
        this._sendPacket(new Packets.ErrorPacket({
          errno   : Errors.ER_QUERY_INTERRUPTED,
          message : 'Interrupted unknown query'
        }));
        break;
    }
  });
});
