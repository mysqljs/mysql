var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'oldpw'
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ok(err);
    assert.equal(err.code, 'HANDSHAKE_INSECURE_AUTH');
    assert.equal(err.fatal, true);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.on('clientAuthentication', function () {
    this._sendPacket(new common.Packets.UseOldPasswordPacket());
  });

  incomingConnection.handshake();
});
