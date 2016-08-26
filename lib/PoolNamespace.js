var PoolSelector = require('./PoolSelector');
var Connection     = require('./Connection');

module.exports = PoolNamespace;

/**
 * PoolNamespace
 * @constructor
 * @param {PoolCluster} cluster The parent cluster for the namespace
 * @param {string} pattern The selection pattern to use
 * @param {string} selector The selector name to use
 * @public
 */
function PoolNamespace(cluster, pattern, selector) {
  this._cluster = cluster;
  this._pattern = pattern;
  this._selector = new PoolSelector[selector]();
}

PoolNamespace.prototype.getConnection = function(cb) {
  var cluster     = this._cluster;
  var namespace   = this;

  this._getClusterNode(function (err, clusterNode) {
    if (err) {
      return cb(err);
    }

    cluster._getConnection(clusterNode, function(err, connection) {
      var retry = err && cluster._canRetry
        && cluster._findNodeIds(namespace._pattern).length !== 0;

      if (retry) {
        namespace.getConnection(cb);
        return;
      }

      if (err) {
        cb(err);
        return;
      }

      cb(null, connection);
    });
  });
};

PoolNamespace.prototype._getClusterNode = function _getClusterNode(cb) {
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

  var clusterNode = nodeId !== null
    ? this._cluster._getNode(nodeId)
    : null;

  if (clusterNode === null) {
    var err = null;

    if (this._cluster._findNodeIds(this._pattern, true).length !== 0) {
      err = new Error('Pool does not have online node.');
      err.code = 'POOL_NONEONLINE';
    } else {
      err = new Error('Pool does not exist.');
      err.code = 'POOL_NOEXIST';
    }

    cb(err);
    return clusterNode;
  }

  cb(null, clusterNode)
  return clusterNode; // for Backward compatibility
};

PoolNamespace.prototype.query = function (sql, values, cb) {
  var namespace = this;

  var query = Connection.createQuery(sql, values, cb);

  namespace._getClusterNode(function (err, clusterNode) {
    if (err) {
      return cb(err);
    }

    if (!(typeof sql === 'object' && 'typeCast' in sql)) {
      query.typeCast = clusterNode.pool.config.connectionConfig.typeCast;
    }

    if (clusterNode.pool.config.connectionConfig.trace) {
      // Long stack trace support
      query._callSite = new Error;
    }

    namespace.getConnection(function (err, conn) {
      if (err) {
        query.on('error', function () {});
        query.end(err);
        return;
      }

      // Release connection based off event
      query.once('end', function() {
        conn.release();
      });

      conn.query(query);
    });
  })

  return query;
}
