var Pool         = require('./Pool');
var PoolConfig   = require('./PoolConfig');
var Util         = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = PoolCluster;

/**
 * PoolCluster
 */
function PoolCluster(config) {
  EventEmitter.call(this);

  config = config || {};
  this._canRetry = typeof config.canRetry === 'undefined' ? true : config.canRetry;
  this._removeNodeErrorCount = config.removeNodeErrorCount || 5;
  this._defaultSelector = config.defaultSelector || 'RR';

  this._closed = false;
  this._lastId = 0;
  this._nodes = {};
  this._serviceableNodeIds = [];
  this._namespaces = {};
  this._findCaches = {};
}

Util.inherits(PoolCluster, EventEmitter);

PoolCluster.prototype.of = function(pattern, selector) {
  pattern = pattern || '*';

  selector = selector || this._defaultSelector;
  selector = selector.toUpperCase();
  if (typeof Selector[selector] === 'undefined') {
    selector = this._defaultSelector;
  }

  var key = pattern + selector;

  if (typeof this._namespaces[key] === 'undefined') {
    this._namespaces[key] = new PoolNamespace(this, pattern, selector);
  }

  return this._namespaces[key];
};

PoolCluster.prototype.add = function(id, config) {
  if (typeof id === 'object') {
    config = id;
    id = 'CLUSTER::' + (++this._lastId);
  }

  if (typeof this._nodes[id] === 'undefined') {
    this._nodes[id] = {
      id: id,
      errorCount: 0,
      pool: new Pool({config: new PoolConfig(config)})
    };

    this._serviceableNodeIds.push(id);

    this._clearFindCaches();
  }
};

PoolCluster.prototype.getConnection = function(pattern, selector, cb) {
  var namespace;
  if (typeof pattern === 'function') {
    cb = pattern;
    namespace = this.of();
  } else {
    if (typeof selector === 'function') {
      cb = selector;
      selector = this._defaultSelector;
    }

    namespace = this.of(pattern, selector);
  }

  namespace.getConnection(cb);
};

PoolCluster.prototype.end = function() {
  if (this._closed) {
    return;
  }

  this._closed = true;

  for (var id in this._nodes) {
    this._nodes[id].pool.end();
  }
};

PoolCluster.prototype._findNodeIds = function(pattern) {
  if (typeof this._findCaches[pattern] !== 'undefined') {
    return this._findCaches[pattern];
  }

  var foundNodeIds;

  if (pattern === '*') { // all
    foundNodeIds = this._serviceableNodeIds;
  } else  if (this._serviceableNodeIds.indexOf(pattern) != -1) { // one
    foundNodeIds = [pattern];
  } else if (pattern[pattern.length - 1] === '*') {
    // wild matching
    var keyword = pattern.substring(pattern.length - 1, 0);

    foundNodeIds = this._serviceableNodeIds.filter(function (id) {
      return id.indexOf(keyword) === 0;
    });
  } else {
    foundNodeIds = [];
  }

  this._findCaches[pattern] = foundNodeIds;

  return foundNodeIds;
};

PoolCluster.prototype._getNode = function(id) {
  return this._nodes[id] || null;
};

PoolCluster.prototype._increaseErrorCount = function(node) {
  if (++node.errorCount >= this._removeNodeErrorCount) {
    var index = this._serviceableNodeIds.indexOf(node.id);
    if (index !== -1) {
      this._serviceableNodeIds.splice(index, 1);
      delete this._nodes[node.id];

      this._clearFindCaches();

      node.pool.end();

      this.emit('remove', node.id);
    }
  }
};

PoolCluster.prototype._decreaseErrorCount = function(node) {
  if (node.errorCount > 0) {
    --node.errorCount;
  }
};

PoolCluster.prototype._getConnection = function(node, cb) {
  var self = this;

  node.pool.getConnection(function (err, connection) {
    if (err) {
      self._increaseErrorCount(node);
      cb(err);
      return;
    } else {
      self._decreaseErrorCount(node);
    }

    connection._clusterId = node.id;

    cb(null, connection);
  });
};

PoolCluster.prototype._clearFindCaches = function() {
  this._findCaches = {};
};

/**
 * PoolNamespace
 */
function PoolNamespace(cluster, pattern, selector) {
  this._cluster = cluster;
  this._pattern = pattern;
  this._selector = new Selector[selector]();
}

PoolNamespace.prototype.getConnection = function(cb) {
  var clusterNode = this._getClusterNode();
  var cluster     = this._cluster;
  var namespace   = this;

  if (clusterNode === null) {
    var err = new Error('Pool does not exist.')
    err.code = 'POOL_NOEXIST';
    return cb(err);
  }

  cluster._getConnection(clusterNode, function(err, connection) {
    var retry = err && cluster._canRetry
      && cluster._findNodeIds(namespace._pattern).length !== 0;

    if (retry) {
      return namespace.getConnection(cb);
    }

    if (err) {
      return cb(err);
    }

    cb(null, connection);
  });
};

PoolNamespace.prototype._getClusterNode = function _getClusterNode() {
  var foundNodeIds = this._cluster._findNodeIds(this._pattern);
  var nodeId;

  switch (foundNodeIds.length) {
    case 0:
      nodeId = null;
      break;
    case 1:
      nodeId = foundNodeIds[0];
      break;
    default:
      nodeId = this._selector(foundNodeIds);
      break;
  }

  return nodeId !== null
    ? this._cluster._getNode(nodeId)
    : null;
};

/**
 * Selector
 */
var Selector = {};

Selector.RR = function () {
  var index = 0;

  return function(clusterIds) {
    if (index >= clusterIds.length) {
      index = 0;
    }

    var clusterId = clusterIds[index++];

    return clusterId;
  };
};

Selector.RANDOM = function () {
  return function(clusterIds) {
    return clusterIds[Math.floor(Math.random() * clusterIds.length)];
  };
};

Selector.ORDER = function () {
  return function(clusterIds) {
    return clusterIds[0];
  };
};
