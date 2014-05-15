var assert          = require('assert');
var common          = require('../../common');
var ClientConstants = require('../../../lib/protocol/constants/client');
var connection      = common.createConnection({
  port : common.fakeServerPort,
  ssl  : 'Amazon RDS'
});

// Ignore bad SSL
connection.config.ssl.rejectUnauthorized = false;

var server = common.createFakeServer();

var connectErr;
server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.connect(function(err) {
    assert.ifError(err);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: ClientConstants.CLIENT_SSL
  });
});
