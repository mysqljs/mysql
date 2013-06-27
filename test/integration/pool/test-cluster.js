var common = require('../../common');
var assert = require('assert');

function createPoolCluster(clusterConfig, poolConfig) {
  var cluster = common.createPoolCluster(clusterConfig);

  if (typeof poolConfig === 'undefined') {
    poolConfig = common.getTestConfig();
  }
  
  cluster.add(poolConfig);
  cluster.add('MASTER', poolConfig);
  cluster.add('SLAVE1', poolConfig);
  cluster.add('SLAVE2', poolConfig);
  
  return cluster;
}

// Test_base_function
(function () {
  var cluster = createPoolCluster();

  // added nodes
  assert.deepEqual(cluster._serviceableNodeIds, ['CLUSTER::1', 'MASTER', 'SLAVE1', 'SLAVE2']);

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
  
  cluster.end();  
})();

// Test_getConnection_one
(function() {
  var cluster = createPoolCluster();
  
  cluster.getConnection('MASTER', function(err, connection) {
    cluster.end();
    
    if (!err) {
      assert.strictEqual(connection._clusterId, 'MASTER');
    }
  }.bind(this));
})();

// Test_of_getConnection_one
(function() {
  var cluster = createPoolCluster();
  
  cluster.of('MASTER').getConnection(function(err, connection) {
    cluster.end();
    
    if (!err) {
      assert.strictEqual(connection._clusterId, 'MASTER');
    }
  }.bind(this));
})();

// Test_getConnection_multi
(function() {
  var cluster = createPoolCluster();

  cluster.getConnection('SLAVE*', 'RR', function(err, connection) {
    if (!err) {
      assert.strictEqual(connection._clusterId, 'SLAVE1');
    }

    cluster.getConnection('SLAVE*', 'RR', function(err, connection) {
      cluster.end();
      
      if (!err) {
        assert.strictEqual(connection._clusterId, 'SLAVE2');
      }
    });
  });
})();

// Test_of_getConnection_multi
(function() {
  var cluster = createPoolCluster();
  var pool = cluster.of('SLAVE*', 'RR');

  pool.getConnection(function(err, connection) {
    if (!err) {
      assert.strictEqual(connection._clusterId, 'SLAVE1');
    }

    pool.getConnection(function(err, connection) {
      cluster.end();
      
      if (!err) {
        assert.strictEqual(connection._clusterId, 'SLAVE2');
      }
    });
  });
})();

// Test_of_getConnection_ORDER_selector
(function() {
  var cluster = createPoolCluster();
  var pool = cluster.of('SLAVE*', 'ORDER');

  pool.getConnection(function(err, connection) {
    if (!err) {
      assert.strictEqual(connection._clusterId, 'SLAVE1');
    }

    pool.getConnection(function(err, connection) {
      cluster.end();
      
      if (!err) {
        assert.strictEqual(connection._clusterId, 'SLAVE1');
      }
    });
  });
})();


// Test_of_getConnection_default_selector
(function() {
  var cluster = createPoolCluster({
    defaultSelector: 'ORDER'
  });
  
  var pool = cluster.of('SLAVE*');

  pool.getConnection(function(err, connection) {
    if (!err) {
      assert.strictEqual(connection._clusterId, 'SLAVE1');
    }

    pool.getConnection(function(err, connection) {
      cluster.end();
      
      if (!err) {
        assert.strictEqual(connection._clusterId, 'SLAVE1');
      }
    });
  });
})();

// Test_retry_throw_error
(function() {  
  var cluster = common.createPoolCluster({
    canRetry: false
  });

  var poolConfig = common.getTestConfig();
  
  var origPort = poolConfig.port;
  poolConfig.port = 3300;
  cluster.add('ERROR', poolConfig);

  poolConfig.port = origPort;
  cluster.add('CORRECT', poolConfig);

  cluster.of('*').getConnection(function (err, connection) {
    cluster.end();
    
    assert.ok(err instanceof Error);  
  });
})();

// Test_retry
(function() {  
  var cluster = common.createPoolCluster();

  var poolConfig = common.getTestConfig();
  
  var origPort = poolConfig.port;
  poolConfig.port = 3300;
  cluster.add('ERROR', poolConfig);

  poolConfig.port = origPort;
  cluster.add('CORRECT', poolConfig);

  cluster.of('*', 'RR').getConnection(function (err, connection) {
    cluster.end();
    
    assert.ok(err === null);
    assert.equal(connection._clusterId, 'CORRECT');

    assert.equal(cluster._nodes.ERROR.errorCount, 1);
  });
})();

// Test_remove_node
(function() {  
  var cluster = common.createPoolCluster({
    removeNodeErrorCount: 1
  });

  var poolConfig = common.getTestConfig();
  
  var origPort = poolConfig.port;
  poolConfig.port = 3300;
  cluster.add('ERROR', poolConfig);

  poolConfig.port = origPort;
  cluster.add('CORRECT', poolConfig);

  var removedNodeId = '';

  cluster.on('remove', function(nodeId) {
    removedNodeId = nodeId;
  });
  
  cluster.of('*', 'RR').getConnection(function (err, connection) {
    cluster.end();
    
    assert.ok(err === null);
    assert.equal(connection._clusterId, 'CORRECT');

    assert.equal(removedNodeId, 'ERROR');

    assert.ok(typeof cluster._nodes.ERROR === 'undefined');
    assert.equal(cluster._serviceableNodeIds.length, 1);
    assert.deepEqual(cluster._serviceableNodeIds, ['CORRECT']);
  });
})();
