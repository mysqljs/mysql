var assert = require('assert');
var common = require('../../common');

var server     = common.createFakeServer();
var serverConn = null;

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

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
