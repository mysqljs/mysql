var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port         : server.port(),
    user         : 'root',
    password     : null,
    insecureAuth : true
  });

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
