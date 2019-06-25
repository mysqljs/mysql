var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({debug: true, port: common.fakeServerPort});
var util   = require('util');

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

  pool.getConnection(function (err, conn1) {
    assert.ifError(err);
    conn1.query('SELECT 1', function (err) {
      assert.ifError(err);
      pool.getConnection(function (err, conn2) {
        assert.ifError(err);
        conn2.query('SELECT 1', function (err) {
          assert.ifError(err);
          conn1.release();
          conn2.release();
          pool.end(function (err) {
            assert.ifError(err);
            assert.equal(messages.length, 20);
            assert.deepEqual(messages, [
              '<-- HandshakeInitializationPacket',
              '--> (1) ClientAuthenticationPacket',
              '<-- (1) OkPacket',
              '--> (1) ComQueryPacket',
              '<-- (1) ResultSetHeaderPacket',
              '<-- (1) FieldPacket',
              '<-- (1) EofPacket',
              '<-- (1) RowDataPacket',
              '<-- (1) EofPacket',
              '<-- HandshakeInitializationPacket',
              '--> (2) ClientAuthenticationPacket',
              '<-- (2) OkPacket',
              '--> (2) ComQueryPacket',
              '<-- (2) ResultSetHeaderPacket',
              '<-- (2) FieldPacket',
              '<-- (2) EofPacket',
              '<-- (2) RowDataPacket',
              '<-- (2) EofPacket',
              '--> (1) ComQuitPacket',
              '--> (2) ComQuitPacket'
            ]);

            server.destroy();
          });
        });
      });
    });
  });
});

server.on('connection', function (conn) {
  conn.handshake({ threadId: ++tid });
});
