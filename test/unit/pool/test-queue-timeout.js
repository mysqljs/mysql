var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  queueTimeout    : 100
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.getConnection(function(err, conn){
    assert.ifError(err);

    setTimeout(function() {
      conn.release();
    }, 200);
  });

  pool.getConnection(function(err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'POOL_QUEUETIMEOUT');
  });

  pool.getConnection(function(err) {
    assert.ok(err, 'got error');
    assert.equal(err.code, 'POOL_QUEUETIMEOUT');
    server.destroy();
  });
});
