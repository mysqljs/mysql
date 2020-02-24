var assert = require('assert');
var common = require('../../common');
var tls    = require('tls');

if (!tls.createSecureContext) {
  common.skipTest('node ' + process.version + ' does not support tls.createSecureContext()');
}

if (!tls.DEFAULT_MAX_VERSION) {
  common.skipTest('node ' + process.version + ' does not support tls maxVersion');
}

var server = common.createFakeServer({
  ssl: {
    maxVersion : tls.DEFAULT_MAX_VERSION,
    minVersion : tls.DEFAULT_MAX_VERSION
  }
});

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    ssl  : {
      ca         : common.getSSLConfig().ca,
      maxVersion : tls.DEFAULT_MIN_VERSION
    }
  });

  connection.connect(function (err) {
    assert.ok(err);
    assert.strictEqual(err.code, 'HANDSHAKE_SSL_ERROR');
    assert.strictEqual(err.fatal, true);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
