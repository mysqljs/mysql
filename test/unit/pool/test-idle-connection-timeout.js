var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  port            : common.fakeServerPort,
  connectionLimit : 10,
  maxIdle         : 1,
  idleTimeout     : 5000
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.once('release', function(connection) {
    assert.ok(connection);
  });

  pool.getConnection(function (err, connection1) {
    assert.ifError(err);
    assert.ok(connection1);
    pool.getConnection(function (err, connection2) {
      assert.ifError(err);
      assert.ok(connection2);
      assert.notEqual(connection1, connection2);
      connection1.release();
      connection2.release();
      assert.equal(pool._allConnections.length, 2);
      assert.equal(pool._freeConnections.length, 2);
      setTimeout(function() {
        assert.equal(pool._allConnections.length, 1);
        assert.equal(pool._freeConnections.length, 1);
        pool.getConnection(function (err, connection3) {
          assert.ifError(err);
          assert.ok(connection3);
          assert.equal(connection3, connection2);
          assert.equal(pool._allConnections.length, 1);
          assert.equal(pool._freeConnections.length, 0);
          connection3.release();
          connection3.destroy();
          server.destroy();
          setTimeout(function () { process.exit(0); }, 1000);
        });
      }, 7000);
    });
  });
});
