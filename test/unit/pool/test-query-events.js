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

  var query   = pool.query('SELECT value FROM stuff');
  var results = [];

  assert.ok(query);

  query.on('end', function() {
    assert.equal(results.length, 2);
    assert.equal(results[0].value, 'one');
    assert.equal(results[1].value, 'two');

    pool.end(function(err) {
      assert.ifError(err);
      server.destroy();
    });
  });
  query.on('error', assert.ifError);
  query.on('result', function(row) {
    results.push(row);
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'SELECT value FROM stuff':
        this._sendPacket(new Packets.ResultSetHeaderPacket({
          fieldCount: 1
        }));

        this._sendPacket(new Packets.FieldPacket({
          catalog    : 'def',
          charsetNr  : Charsets.UTF8_GENERAL_CI,
          name       : 'value',
          protocol41 : true,
          type       : Types.VAR_STRING
        }));

        this._sendPacket(new Packets.EofPacket());

        var writer = new PacketWriter();
        writer.writeLengthCodedString('one');
        this._socket.write(writer.toBuffer(this._parser));

        var writer = new PacketWriter();
        writer.writeLengthCodedString('two');
        this._socket.write(writer.toBuffer(this._parser));

        this._sendPacket(new Packets.EofPacket());
        this._parser.resetPacketNumber();
        break;
      default:
        this._handlePacketQuery(packet);
        break;
    }
  });
});
