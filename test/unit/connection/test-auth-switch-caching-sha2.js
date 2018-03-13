var assert = require('assert');
var crypto = require('crypto');
var common = require('../../common');

var random = crypto.pseudoRandomBytes || crypto.randomBytes; // Depends on node.js version

var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
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
  random(20, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('authSwitchResponse', function (packet) {
      this._sendAuthResponse(packet.data, common.Auth.sha2Token('authswitch', scramble));
    });

    incomingConnection.on('clientAuthentication', function () {
      this.authSwitchRequest({
        authMethodName : 'caching_sha2_password',
        authMethodData : scramble
      });
    });

    incomingConnection.handshake();
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
