var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  user     : 'user_1',
  password : 'passwd'
});

var server = common.createFakeServer();

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user           : connection.config.user,
    password       : connection.config.password,
    authPluginName : 'mysql_unsupported_plugin'
  });
});

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2', password: 'passwd'}, function (err) {
      assert.equal(err.code, 'UNSUPPORTED_AUTH_PLUGIN');
      connection.destroy();
      server.destroy();
    });
  });
});
