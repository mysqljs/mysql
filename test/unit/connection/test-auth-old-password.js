var common     = require('../../common');
var connection = common.createConnection({
  port         : common.fakeServerPort,
  password     : 'oldpw',
  insecureAuth : true
});
var assert     = require('assert');
var Auth       = require(common.lib + '/protocol/Auth');
var Crypto     = require('crypto');

var random = Crypto.pseudoRandomBytes || Crypto.randomBytes; // Depends on node.js version
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
  random(8, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('clientAuthentication', function () {
      this._sendPacket(new common.Packets.UseOldPasswordPacket());
    });

    incomingConnection.on('OldPasswordPacket', function (packet) {
      var expected = Auth.scramble323(scramble, 'oldpw');
      this._sendAuthResponse(packet.scrambleBuff, expected);
    });

    incomingConnection.handshake({
      scrambleBuff1: scramble
    });
  });
});
