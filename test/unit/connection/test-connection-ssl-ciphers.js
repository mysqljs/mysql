var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer({
  ssl: {
    ciphers: 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:AES128-SHA:HIGH:!MD5:!aNULL:!EDH'
  }
});

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    ssl  : {
      ca      : common.getSSLConfig().ca,
      ciphers : 'AES128-SHA'
    }
  });

  connection.query('SHOW STATUS LIKE \'Ssl_cipher\';', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Variable_name, 'Ssl_cipher');
    assert.equal(rows[0].Value, 'AES128-SHA');

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({
    serverCapabilities1: common.ClientConstants.CLIENT_SSL
  });
});
