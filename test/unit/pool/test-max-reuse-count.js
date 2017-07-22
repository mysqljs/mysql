var assert = require('assert');
var common = require('../../common');

var pool = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  maxReuseCount   : 1
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    connection.release();

    assert.equal(pool.getStatus().all, 1);

    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      connection.release();

      assert.equal(pool.getStatus().all, 0);

      server.destroy();
    });
  });
});
