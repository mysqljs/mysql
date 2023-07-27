var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connectionLimit = 3;
  var pool = common.createPool({ port: server.port(), connectionLimit: connectionLimit } );
  assert.equal(connectionLimit, pool.config.connectionLimit);
  assert.equal(pool.getConnectionCounts().allConnectionsCount, 0);
  assert.equal(pool.getConnectionCounts().idleConnectionsCount, 0);
  assert.equal(pool.getConnectionCounts().connectionQueueCount, 0);
  assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 0);
  assert.equal(pool.getConnectionCounts().busyConnectionsCount, 0);

  var conn1, conn2, conn3, conn4, conn5;

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    conn1 = connection;
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    conn2 = connection;
  });
  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    conn3 = connection;
  });
  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    conn4 = connection;
  });
  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    conn5 = connection;
  });

  setTimeout(function(){
    assert.ok(conn1);
    assert.ok(conn2);
    assert.ok(conn3);
    assert.ok(conn4 === undefined);
    assert.ok(conn5 === undefined);
    assert.equal(pool.getConnectionCounts().allConnectionsCount, 3);
    assert.equal(pool.getConnectionCounts().idleConnectionsCount, 0);
    assert.equal(pool.getConnectionCounts().connectionQueueCount, 2);
    assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 0);
    assert.equal(pool.getConnectionCounts().busyConnectionsCount, 3);

    pool.releaseConnection(conn1);
    assert.equal(pool.getConnectionCounts().allConnectionsCount, 3);
    assert.equal(pool.getConnectionCounts().idleConnectionsCount, 0);
    assert.equal(pool.getConnectionCounts().connectionQueueCount, 1);
    assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 1);
    assert.equal(pool.getConnectionCounts().busyConnectionsCount, 2);

    setTimeout(function() {
      assert.ok(conn4);
      assert.ok(conn5 === undefined);
      assert.equal(pool.getConnectionCounts().allConnectionsCount, 3);
      assert.equal(pool.getConnectionCounts().idleConnectionsCount, 0);
      assert.equal(pool.getConnectionCounts().connectionQueueCount, 1);
      assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 0);
      assert.equal(pool.getConnectionCounts().busyConnectionsCount, 3);

      pool.releaseConnection(conn2);
      pool.releaseConnection(conn3);
      pool.releaseConnection(conn4);
      assert.equal(pool.getConnectionCounts().allConnectionsCount, 3);
      assert.equal(pool.getConnectionCounts().idleConnectionsCount, 2);
      assert.equal(pool.getConnectionCounts().connectionQueueCount, 0);
      assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 1);
      assert.equal(pool.getConnectionCounts().busyConnectionsCount, 0);

      setTimeout(function() {
        assert.ok(conn5);
        pool.releaseConnection(conn5);
        assert.equal(pool.getConnectionCounts().allConnectionsCount, 3);
        assert.equal(pool.getConnectionCounts().idleConnectionsCount, 3);
        assert.equal(pool.getConnectionCounts().connectionQueueCount, 0);
        assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 0);
        assert.equal(pool.getConnectionCounts().busyConnectionsCount, 0);
        pool.end(function(err){
          assert.ifError(err);
          assert.equal(pool.getConnectionCounts().allConnectionsCount, 0);
          assert.equal(pool.getConnectionCounts().idleConnectionsCount, 0);
          assert.equal(pool.getConnectionCounts().connectionQueueCount, 0);
          assert.equal(pool.getConnectionCounts().acquiringConnectionsCount, 0);
          assert.equal(pool.getConnectionCounts().busyConnectionsCount, 0);
          server.destroy();
        });
      }, 100);
    }, 100);
  }, 100);

});
