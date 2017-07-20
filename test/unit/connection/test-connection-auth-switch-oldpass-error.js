var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});
var assert     = require('assert');

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.connect(function(err) {
    assert.equal(err.code, 'HANDSHAKE_INSECURE_AUTH');
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user             : connection.config.user,
    password         : connection.config.password,
    forceAuthSwitch  : true,
    authSwitchPlugin : 'mysql_old_password'
  });
});
