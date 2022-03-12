var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool   = common.createPool({
    acquireTimeout  : 100,
    connectionLimit : 1,
    port            : server.port()
  });

  pool.getConnection(function (err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
    assert.equal(err.fatal, true);
    assert.equal(err.message, 'Handshake inactivity timeout');
    server.destroy();
  });
});

server.on('connection', function () {
  // timeout handshake
});
