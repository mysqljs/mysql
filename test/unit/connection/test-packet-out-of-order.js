var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var server     = common.createFakeServer();
var serverConn = null;

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.connect(function(err) {
    assert.ifError(err);

    serverConn.ok();

    connection.end(function(err) {
      assert.ok(err);
      assert.equal(err.code, 'PROTOCOL_PACKETS_OUT_OF_ORDER');
      assert.equal(err.fatal, true);
      assert.ok(/Packets out of order/.test(err.message));
      server.destroy();
    });
  });
});

server.on('connection', function(incomingConnection) {
  serverConn = incomingConnection;
  incomingConnection.handshake();
});
