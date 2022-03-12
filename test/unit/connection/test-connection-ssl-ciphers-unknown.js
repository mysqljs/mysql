var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    ssl  : {
      ca      : common.getSSLConfig().ca,
      ciphers : 'BOGUS-CIPHER'
    }
  });

  connection.connect(function (err) {
    assert.ok(err);
    assert.equal(err.code, 'HANDSHAKE_SSL_ERROR');
    assert.equal(err.fatal, true);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
