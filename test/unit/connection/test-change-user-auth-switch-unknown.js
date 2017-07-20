var assert     = require('assert');
var Buffer     = require('safe-buffer').Buffer;
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  user     : 'user_1',
  password : 'pass_1'
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2', password: 'pass_2'}, function (err) {
      assert.ok(err);
      assert.equal(err.code, 'UNSUPPORTED_AUTH_METHOD');
      assert.equal(err.fatal, true);
      assert.ok(/foo_plugin_password/.test(err.message));

      connection.destroy();
      server.destroy();
    });
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.on('changeUser', function () {
    this.authSwitchRequest({
      authMethodName : 'foo_plugin_password',
      authMethodData : Buffer.alloc(0)
    });
  });

  incomingConnection.handshake();
});
