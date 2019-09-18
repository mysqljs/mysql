var assert = require('assert');
var crypto = require('crypto');
var common = require('../../common');
var Auth   = require(common.lib + '/protocol/Auth');

var random = crypto.pseudoRandomBytes || crypto.randomBytes; // Depends on node.js version

var connection = common.createConnection({
  port       : common.fakeServerPort,
  password   : 'passwd',
  secureAuth : false
});
var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ok(err, 'should get error');
    assert.equal(err.code, 'HANDSHAKE_SECURE_TRANSPORT_REQUIRED');
    assert.ok(err.fatal);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  random(20, function (err, scramble) {
    assert.ifError(err);

    incomingConnection.on('clientAuthentication', function (packet) {
      this._resetAuthProcess(packet.scrambleBuff, Auth.sha2Token('passwd', scramble));
    });

    incomingConnection.handshake({
      authMethodName : 'caching_sha2_password',
      scrambleBuff1  : scramble.slice(0, 8),
      scrambleBuff2  : scramble.slice(8, 20)
    });
  });
});
