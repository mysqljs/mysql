var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  acquireTimeout  : 100,
  connectionLimit : 1,
  port            : common.fakeServerPort
});
var server  = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, conn) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
    assert.equal(err.fatal, true);
    assert.equal(err.message, 'Handshake inactivity timeout');
    server.destroy();
  });
});

server.on('connection', function (conn) {
  // timeout handshake
});
