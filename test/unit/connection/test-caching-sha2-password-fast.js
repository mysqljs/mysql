var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'passwd'
});

var server = common.createFakeServer();

var connected;
server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err, result) {
    assert.ifError(err);

    connected = result;

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1 : common.ClientConstants.CLIENT_SSL,
    user                : connection.config.user,
    password            : connection.config.password,
    authMethodName      : 'caching_sha2_password',
    authSwitchType      : 'fast_auth_success'
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
