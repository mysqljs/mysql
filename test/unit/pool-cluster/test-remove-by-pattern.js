var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add('SLAVE1', poolConfig);
  cluster.add('SLAVE2', poolConfig);

  var pool = cluster.of('SLAVE*', 'ORDER');

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.strictEqual(connection._clusterId, 'SLAVE1');

    connection.release();
    cluster.remove('SLAVE*');

    pool.getConnection(function (err) {
      assert.ok(err);
      assert.equal(err.code, 'POOL_NOEXIST');

      cluster.remove('SLAVE*');

      cluster.end(function (err) {
        assert.ifError(err);
        server.destroy();
      });
    });
  });
});
