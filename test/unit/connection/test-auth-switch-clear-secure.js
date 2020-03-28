var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch',
  ssl      : {
    rejectUnauthorized: false
  }
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
  assert.equal(connected.fieldCount, 0);
});
