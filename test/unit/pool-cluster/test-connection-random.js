var assert     = require('assert');
var common     = require('../../common');
var seedrandom = require('seedrandom');
var cluster    = common.createPoolCluster();
var server     = common.createFakeServer();

var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);
cluster.add('SLAVE3', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var count = 7;
  var order = [];
  var pool  = cluster.of('SLAVE*', 'RANDOM');

  seedrandom('cluster random rest', {
    global: true
  });

  next();

  function done() {
    assert.deepEqual(order, [
      'SLAVE2',
      'SLAVE3',
      'SLAVE2',
      'SLAVE2',
      'SLAVE1',
      'SLAVE2',
      'SLAVE1'
    ]);
    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  }

  function next() {
    pool.getConnection(function (err, conn) {
      assert.ifError(err);
      order.push(conn._clusterId);
      conn.release();

      if (--count > 0) {
        next();
      } else {
        done();
      }
    });
  }
});
