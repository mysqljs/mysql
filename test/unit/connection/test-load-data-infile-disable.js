var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort, localInfile: false});
var server     = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('LOAD DATA LOCAL INFILE ? INTO TABLE ??', ['data.csv', 'foo'], function (err, result) {
    assert.ok(err);
    assert.equal(err.code, 'LOCAL_FILES_DISABLED');
    assert.ok(!err.fatal);
    assert.equal(result.affectedRows, 0);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(conn) {
  conn.on('clientAuthentication', function (packet) {
    if (packet.clientFlags & common.ClientConstants.LOCAL_FILES) {
      conn.deny();
    } else {
      conn.ok();
    }
  });
  conn.on('query', function (packet) {
    if (packet.sql.indexOf('LOAD DATA LOCAL INFILE') === 0) {
      conn.once('EmptyPacket', function () {
        conn.ok();
      });
      this._sendPacket(new common.Packets.LocalInfileRequestPacket({
        filename: common.fixtures + '/data.csv'
      }));
    } else {
      this._handleQueryPacket(packet);
    }
  });
  conn.handshake();
});
