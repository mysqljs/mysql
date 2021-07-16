var assert     = require('assert');
var Crypto     = require('crypto');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  user     : 'user_1',
  password : 'pass_1'
});

var random = Crypto.pseudoRandomBytes || Crypto.randomBytes; // Depends on node.js version
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2', password: 'pass_2'}, function (err) {
      assert.ifError(err);
      connection.destroy();
      server.destroy();
    });
  });
});

server.on('connection', function (incomingConnection) {
  random(20, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('authSwitchResponse', function (packet) {
      this._sendAuthResponse(packet.data, common.Auth.token('pass_2', scramble));
    });

    incomingConnection.on('changeUser', function () {
      this.authSwitchRequest({
        authMethodName : 'mysql_native_password',
        authMethodData : scramble
      });
    });

    incomingConnection.handshake();
  });
});
