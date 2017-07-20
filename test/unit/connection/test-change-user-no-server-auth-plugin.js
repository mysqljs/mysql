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
    user                : connection.config.user,
    password            : connection.config.password,
    serverCapabilities2 : 0, // No PLUGIN_AUTH
    clientPluginAuth    : false,
    authPluginName      : null
  });
});

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.query('SELECT CURRENT_USER()', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['CURRENT_USER()'], 'user_1@localhost');

    connection.changeUser({user: 'user_2', password: 'passwd'}, function (err) {
      assert.ifError(err);

      connection.query('SELECT CURRENT_USER()', function (err, result) {
        assert.ifError(err);
        assert.strictEqual(result[0]['CURRENT_USER()'], 'user_2@localhost');

        connection.destroy();
        server.destroy();
      });
    });
  });
});
