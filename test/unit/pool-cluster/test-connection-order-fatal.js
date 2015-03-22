var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var poolConfig1 = common.getTestConfig({port: common.bogusPort});
var poolConfig2 = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig1);
cluster.add('SLAVE2', poolConfig2);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var conn1;
  var conn2;
  var pool = cluster.of('SLAVE*', 'ORDER');
  var wait = 2;

  function done() {
    if (--wait) return;

    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  }

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.strictEqual(connection._clusterId, 'SLAVE2');

    conn1 = connection;
    done();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.strictEqual(connection._clusterId, 'SLAVE2');

    conn2 = connection;
    done();
  });
});
