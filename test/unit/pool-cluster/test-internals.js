var assert = require('assert');
var common = require('../../common');

var cluster = common.createPoolCluster();
var server  = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var poolConfig = common.getTestConfig({port: server.port()});
  cluster.add(poolConfig);
  cluster.add('MASTER', poolConfig);
  cluster.add('SLAVE1', poolConfig);
  cluster.add('SLAVE2', poolConfig);

  // added nodes
  assert.deepEqual(Object.keys(cluster._nodes), ['CLUSTER::1', 'MASTER', 'SLAVE1', 'SLAVE2']);

  // _findNodeIds
  assert.deepEqual(cluster._findNodeIds('MASTER'), ['MASTER']);
  assert.deepEqual(cluster._findNodeIds('MA*ER'), ['MASTER']);
  assert.deepEqual(cluster._findNodeIds('*TER*'), ['CLUSTER::1', 'MASTER']);
  assert.deepEqual(cluster._findNodeIds('SLAVE*'), ['SLAVE1', 'SLAVE2']);
  assert.deepEqual(cluster._findNodeIds(/slave[1-2]/i), ['SLAVE1', 'SLAVE2']);

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
