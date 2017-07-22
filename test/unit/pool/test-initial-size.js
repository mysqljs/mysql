var assert = require('assert');
var common = require('../../common');

var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  initialSize     : 2
});

var server = common.createFakeServer();
var prepared = false;

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.on('prepared', function(preparedConnectionCount) {
    prepared = true;
    assert.equal(preparedConnectionCount, 2);
  });

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    conn.release();
  });

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    assert.equal(prepared, true);

    conn.release();
    server.destroy();
  });
});
