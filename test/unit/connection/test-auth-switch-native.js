var assert     = require('assert');
var Crypto     = require('crypto');
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});
var Auth       = require(common.lib + '/protocol/Auth');

var random = Crypto.pseudoRandomBytes || Crypto.randomBytes; // Depends on node.js version
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
  random(20, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('clientAuthentication', function () {
      this._sendPacket(new common.Packets.AuthSwitchRequestPacket({
        authMethodName : 'mysql_native_password',
        authMethodData : scramble
      }));
    });

    incomingConnection.on('AuthSwitchResponsePacket', function (packet) {
      this._sendAuthResponse(packet.data, Auth.token('authswitch', scramble));
    });

    incomingConnection.handshake();
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
