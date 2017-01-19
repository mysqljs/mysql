var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port : common.fakeServerPort,
  ssl  : 'Amazon RDS'
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.connect(function(err) {
    assert.ok(err);
    assert.equal(err.code, 'HANDSHAKE_SSL_ERROR');
    assert.equal(err.fatal, true);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
