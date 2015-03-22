var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var connCount  = 0;
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var pool = cluster.of('SLAVE*', 'RR');

  pool.getConnection(function (err, conn1) {
    assert.ifError(err);
    assert.strictEqual(conn1._clusterId, 'SLAVE1');

    pool.getConnection(function (err, conn2) {
      assert.ifError(err);
      assert.strictEqual(conn2._clusterId, 'SLAVE2');

      conn1.release();
      conn2.release();

      cluster.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    });
  });
});
