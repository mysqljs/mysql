var assert = require('assert');
var common = require('../../common');
var tls    = require('tls');

if (!tls.createSecureContext) {
  common.skipTest('node ' + process.version + ' does not support tls.createSecureContext()');
}

if (!tls.DEFAULT_MIN_VERSION) {
  common.skipTest('node ' + process.version + ' does not support tls minVersion');
}

var server = common.createFakeServer({
  ssl: {
    maxVersion : tls.DEFAULT_MIN_VERSION,
    minVersion : tls.DEFAULT_MIN_VERSION
  }
});

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    ssl  : {
      ca         : common.getSSLConfig().ca,
      minVersion : tls.DEFAULT_MIN_VERSION
    }
  });

  connection.connect(function (err) {
    assert.ifError(err);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
