var assert     = require('assert');
var crypto     = require('crypto');
var common     = require('../../common');

var publicEncrypt = crypto.publicEncrypt;
crypto.publicEncrypt = undefined;

var connection = common.createConnection({
  port       : common.fakeServerPort,
  password   : 'passwd',
  secureAuth : true
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'HANDSHAKE_SECURE_TRANSPORT_REQUIRED');
    assert.ok(err.fatal);

    connection.destroy();
    server.destroy();

    crypto.publicEncrypt = publicEncrypt;
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user           : connection.config.user,
    password       : connection.config.password,
    authMethodName : 'caching_sha2_password',
    authSwitchType : 'perform_full_authentication'
  });
});
