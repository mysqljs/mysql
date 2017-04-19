var after   = require('after');
var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var count      = 5;
var order      = [];
var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

var done = after(count, function () {
  assert.deepEqual(order, [
    'SLAVE1',
    'SLAVE2',
    'SLAVE1',
    'SLAVE2',
    'SLAVE1'
  ]);
  cluster.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var pool = cluster.of('SLAVE*', 'RR');

  function getConnection(i) {
    pool.getConnection(function (err, conn) {
      assert.ifError(err);
      order[i] = conn._clusterId;
      conn.release();
      done();
    });
  }

  for (var i = 0; i < count; i++) {
    getConnection(i);
  }
});
