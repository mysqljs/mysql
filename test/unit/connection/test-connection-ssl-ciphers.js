var assert     = require('assert');
var common     = require('../../common');
var tls        = require('tls');
var tlsCipher = 'RC4-SHA';

if (typeof tls.getCiphers === 'function') {
  tlsCipher = tls.getCiphers()[0].toUpperCase();
}

var connection = common.createConnection({
  port : common.fakeServerPort,
  ssl  : {
    ca      : common.getSSLConfig().ca,
    ciphers : tlsCipher
  }
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query('SHOW STATUS LIKE \'Ssl_cipher\';', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Variable_name, 'Ssl_cipher');
    assert.equal(rows[0].Value, tlsCipher);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
