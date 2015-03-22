var assert     = require('assert');
var common     = require('../../common');
var cluster    = common.createPoolCluster();
var poolConfig = common.getTestConfig();

assert.doesNotThrow(cluster.add.bind(cluster, 'SLAVE1', poolConfig));

cluster.end(function (err) {
  assert.ifError(err);

  assert.throws(cluster.add.bind(cluster, 'SLAVE3', poolConfig), /PoolCluster is closed/);
});

assert.throws(cluster.add.bind(cluster, 'SLAVE2', poolConfig), /PoolCluster is closed/);
