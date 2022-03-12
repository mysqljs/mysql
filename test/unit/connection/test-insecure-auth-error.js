var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port     : server.port(),
    password : 'oldpw'
  });

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
