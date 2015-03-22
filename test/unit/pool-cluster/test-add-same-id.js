var assert     = require('assert');
var common     = require('../../common');
var cluster    = common.createPoolCluster();
var poolConfig = common.getTestConfig();

assert.doesNotThrow(cluster.add.bind(cluster, 'SLAVE1', poolConfig));
assert.throws(cluster.add.bind(cluster, 'SLAVE1', poolConfig), /Node ID "SLAVE1" is already defined in PoolCluster/);
