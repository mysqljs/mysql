var assert     = require('assert');
var Crypto     = require('crypto');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});

var random = Crypto.pseudoRandomBytes || Crypto.randomBytes; // Depends on node.js version
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
  random(20, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('authSwitchResponse', function (packet) {
      this._sendAuthResponse(packet.data, common.Auth.token('authswitch', scramble));
    });

    incomingConnection.on('clientAuthentication', function () {
      this.authSwitchRequest({
        authMethodName : 'mysql_native_password',
        authMethodData : scramble
      });
    });

    incomingConnection.handshake();
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
