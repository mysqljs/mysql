var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig1 = common.getTestConfig({port: common.bogusPort});
  var poolConfig2 = common.getTestConfig({port: server.port()});
  cluster.add('SLAVE1', poolConfig1);
  cluster.add('SLAVE2', poolConfig2);

  var pool = cluster.of('SLAVE*', 'ORDER');

  var done = after(2, function () {
    cluster.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.strictEqual(connection._clusterId, 'SLAVE2');
    done();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.strictEqual(connection._clusterId, 'SLAVE2');
    done();
  });
});
