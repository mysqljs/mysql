var Pool          = require('./Pool');
var PoolConfig    = require('./PoolConfig');
var PoolNamespace = require('./PoolNamespace');
var PoolSelector  = require('./PoolSelector');
var Util          = require('util');
var EventEmitter  = require('events').EventEmitter;

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
  this._findCaches = Object.create(null);
  this._lastId = 0;
  this._namespaces = Object.create(null);
  this._nodes = Object.create(null);
  this._serviceableNodeIds = [];
}

Util.inherits(PoolCluster, EventEmitter);

PoolCluster.prototype.add = function add(id, config) {
  if (this._closed) {
    throw new Error('PoolCluster is closed.');
  }

  var nodeId = typeof id === 'object'
    ? 'CLUSTER::' + (++this._lastId)
    : String(id);

  if (this._nodes[nodeId] !== undefined) {
    throw new Error('Node ID "' + nodeId + '" is already defined in PoolCluster.');
  }

  var poolConfig = typeof id !== 'object'
    ? new PoolConfig(config)
    : new PoolConfig(id);

  this._nodes[nodeId] = {
    id: nodeId,
    errorCount: 0,
    pool: new Pool({config: poolConfig})
  };

  this._serviceableNodeIds.push(nodeId);

  this._clearFindCaches();
};

PoolCluster.prototype.end = function end(callback) {
  var cb = callback !== undefined
    ? callback
    : _cb;

  if (typeof cb !== 'function') {
    throw TypeError('callback argument must be a function')
  }

  if (this._closed) {
    return process.nextTick(cb);
  }

  this._closed = true;

  var calledBack   = false;
  var nodeIds      = Object.keys(this._nodes);
  var waitingClose = nodeIds.length;

  function onEnd(err) {
    if (calledBack) {
      return;
    }

    if (err || --waitingClose === 0) {
      calledBack = true;
      return cb(err);
    }
  }

  if (waitingClose === 0) {
    return process.nextTick(cb);
  }

  for (var i = 0; i < nodeIds.length; i++) {
    var nodeId = nodeIds[i];
    var node = this._nodes[nodeId];

    node.pool.end(onEnd);
  }
};

PoolCluster.prototype.of = function(pattern, selector) {
  pattern = pattern || '*';

  selector = selector || this._defaultSelector;
  selector = selector.toUpperCase();
  if (typeof PoolSelector[selector] === 'undefined') {
    selector = this._defaultSelector;
  }

  var key = pattern + selector;

  if (typeof this._namespaces[key] === 'undefined') {
    this._namespaces[key] = new PoolNamespace(this, pattern, selector);
  }

  return this._namespaces[key];
};

PoolCluster.prototype.remove = function remove(pattern) {
  var foundNodeIds = this._findNodeIds(pattern);

  for (var i = 0; i < foundNodeIds.length; i++) {
    var node = this._getNode(foundNodeIds[i]);
    var index = this._serviceableNodeIds.indexOf(node.id);

    if (index !== -1) {
      this._serviceableNodeIds.splice(index, 1);
      delete this._nodes[node.id];

      this._clearFindCaches();

      node.pool.end(_noop);
    }
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

PoolCluster.prototype._clearFindCaches = function _clearFindCaches() {
  this._findCaches = Object.create(null);
};

PoolCluster.prototype._findNodeIds = function(pattern) {
  if (this._findCaches[pattern] !== undefined) {
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

      node.pool.end(_noop);

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

function _cb(err) {
  if (err) {
    throw err;
  }
}

function _noop() {}
