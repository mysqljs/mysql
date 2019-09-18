var assert  = require('assert');
var common  = require('../../common');
var Packets = require(common.lib + '/protocol/packets');

var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'passwd'
});

var server = common.createFakeServer();
var connected;

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.connect(function (err, result) {
    assert.ifError(err);

    connected = result;

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.on('clientAuthentication', function () {
    this._sendPacket(new Packets.FastAuthSuccessPacket());
    this._sendPacket(new Packets.OkPacket());
  });

  incomingConnection.handshake({
    authMethodName      : 'caching_sha2_password',
    serverCapabilities1 : common.ClientConstants.CLIENT_SSL
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
