var assert     = require('assert');
var Buffer     = require('safe-buffer').Buffer;
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ok(err);
    assert.equal(err.code, 'UNSUPPORTED_AUTH_METHOD');
    assert.equal(err.fatal, true);
    assert.ok(/foo_plugin_password/.test(err.message));

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.on('clientAuthentication', function () {
    this.authSwitchRequest({
      authMethodName : 'foo_plugin_password',
      authMethodData : Buffer.alloc(0)
    });
  });

  incomingConnection.handshake();
});
