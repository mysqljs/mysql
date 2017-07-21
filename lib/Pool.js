var mysql          = require('../');
var Connection     = require('./Connection');
var EventEmitter   = require('events').EventEmitter;
var Util           = require('util');
var PoolConnectionManager = require('./PoolConnectionManager');

module.exports = Pool;

Util.inherits(Pool, EventEmitter);
function Pool(options) {
  EventEmitter.call(this);

  this.config = options.config;
  this._manager = new PoolConnectionManager(this,  options.config);
  this._closed = false;
}

Pool.prototype.getConnection = function (callback) {
  if (this._isClosed(callback)) {
    return;
  }

  var manager = this._manager;

  if (manager.isPrepared()) {
    var connection = manager.getIdleConnection();
    if (connection) {
      manager.executeCallback(callback, connection);
      return;
    }

    if (manager.canCreateNewConnection()) {
      manager.createNewConnection(callback);
      return;
    }
  }

  // If there is no available connection
  manager.putCallbackToQueue(callback);
};

Pool.prototype.releaseConnection = function (connection) {
  if (!this._closed) {
    this._manager.releaseConnection(connection);
  }
};

Pool.prototype.end = function (callback) {
  this._closed = true;

  if (typeof callback !== 'function') {
    callback = function (err) {
      if (err) throw err;
    };
  }

  this._manager.destroy(callback);
};

Pool.prototype.query = function (sql, values, cb) {
  var query = Connection.createQuery(sql, values, cb);

  if (!(typeof sql === 'object' && 'typeCast' in sql)) {
    query.typeCast = this.config.connectionConfig.typeCast;
  }

  if (this.config.connectionConfig.trace) {
    // Long stack trace support
    query._callSite = new Error();
  }

  this.getConnection(function (err, conn) {
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

  return query;
};

Pool.prototype.escape = function(value) {
  return mysql.escape(value, this.config.connectionConfig.stringifyObjects, this.config.connectionConfig.timezone);
};

Pool.prototype.escapeId = function escapeId(value) {
  return mysql.escapeId(value, false);
};

Pool.prototype.getStatus = function () {
  return this._manager.getStatus();
};

Pool.prototype._purgeConnection = function (connection) {
  this._manager.purgeConnection(connection);
};

Pool.prototype._isClosed = function (callback) {
  if (this._closed) {
    if (callback) {
      var err = new Error('Pool is closed.');
      err.code = 'POOL_CLOSED';
      process.nextTick(function () {
        callback(err);
      });
    }

    return true;
  }

  return false;
};
