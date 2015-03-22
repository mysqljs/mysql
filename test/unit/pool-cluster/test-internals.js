var assert  = require('assert');
var common  = require('../../common');
var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

var poolConfig = common.getTestConfig({port: common.fakeServerPort});
cluster.add(poolConfig);
cluster.add('MASTER', poolConfig);
cluster.add('SLAVE1', poolConfig);
cluster.add('SLAVE2', poolConfig);

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  // added nodes
  assert.deepEqual(Object.keys(cluster._nodes), ['CLUSTER::1', 'MASTER', 'SLAVE1', 'SLAVE2']);

  // _findNodeIds
  assert.deepEqual(cluster._findNodeIds('MASTER'), ['MASTER']);
  assert.deepEqual(cluster._findNodeIds('SLAVE*'), ['SLAVE1', 'SLAVE2']);

  // of singletone instance
  var poolNamespace = cluster.of('*', 'RR');
  var poolNamespace2 = cluster.of('*');
  assert.strictEqual(poolNamespace, poolNamespace2);

  // empty pattern
  var emptyPoolNamespace = cluster.of();
  assert.strictEqual(poolNamespace, emptyPoolNamespace);

  // wrong selector
  var wrongPoolNamespace = cluster.of('*', 'RR2');
  assert.strictEqual(poolNamespace, wrongPoolNamespace);

  server.destroy();
});
