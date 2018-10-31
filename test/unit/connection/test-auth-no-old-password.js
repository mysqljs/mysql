var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port         : common.fakeServerPort,
  user         : 'root',
  password     : null,
  insecureAuth : true
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ifError(err);
    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.on('clientAuthentication', function () {
    this._sendPacket(new common.Packets.UseOldPasswordPacket());
  });

  incomingConnection.on('OldPasswordPacket', function (packet) {
    if (packet.scrambleBuff.length === 0) {
      this.ok();
    } else {
      this.deny();
    }
  });

  incomingConnection.handshake();
});
