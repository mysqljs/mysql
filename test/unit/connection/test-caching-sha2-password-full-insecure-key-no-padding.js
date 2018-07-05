var Buffer     = require('safe-buffer').Buffer;
var assert     = require('assert');
var crypto     = require('crypto');
var common     = require('../../common');

var publicEncrypt = crypto.publicEncrypt;
crypto.publicEncrypt = publicEncrypt || function () {
  return Buffer.from('passwd', 'utf8');
};

var secureAuth = {
  key: common.getServerPublicKey()
};

var connection = common.createConnection({
  port       : common.fakeServerPort,
  password   : 'passwd',
  secureAuth : secureAuth
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

    crypto.publicEncrypt = publicEncrypt;
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user           : connection.config.user,
    password       : connection.config.password,
    authMethodName : 'caching_sha2_password',
    authSwitchType : 'perform_full_authentication',
    secureAuth     : secureAuth
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
