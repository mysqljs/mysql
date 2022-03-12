var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function(err) {
  if (err) throw err;

  var connection = common.createConnection({
    port : server.port(),
    ssl  : 'Amazon RDS'
  });

  // Ignore bad SSL
  connection.config.ssl.rejectUnauthorized = false;

  connection.connect(function(err) {
    assert.ifError(err);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
