var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});

var server = common.createFakeServer();

var error;
server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    error = err;
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.on('authSwitchResponse', function (packet) {
    this._sendAuthResponse(packet.data, Buffer.from('authswitch'));
  });

  incomingConnection.on('clientAuthentication', function () {
    this.authSwitchRequest({
      authMethodName : 'mysql_clear_password',
      authMethodData : Buffer.alloc(0)
    });
  });

  incomingConnection.handshake();
});

process.on('exit', function() {
  assert.equal(error.message, 'Authentication method mysql_clear_password not supported on insecure connections');
});
