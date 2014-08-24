var mysql          = require('../');
var Connection     = require('./Connection');
var EventEmitter   = require('events').EventEmitter;
var Util           = require('util');
var PoolConnection = require('./PoolConnection');

module.exports = Pool;

Util.inherits(Pool, EventEmitter);
function Pool(options) {
  EventEmitter.call(this);
  this.config = options.config;
  this.config.connectionConfig.pool = this;

  this._allConnections   = [];
  this._freeConnections  = [];
  this._connectionQueue  = [];
  this._closed           = false;
}

Pool.prototype.getConnection = function (cb) {

  if (this._closed) {
    return process.nextTick(function(){
      return cb(new Error('Pool is closed.'));
    });
  }

  var connection;

  if (this._freeConnections.length > 0) {
    connection = this._freeConnections.shift();

    return this.acquireConnection(connection, cb);
  }

  if (this.config.connectionLimit === 0 || this._allConnections.length < this.config.connectionLimit) {
    connection = new PoolConnection(this, { config: this.config.newConnectionConfig() });

    this._allConnections.push(connection);

    return connection.connect({timeout: this.config.acquireTimeout}, function (err) {
      if (this._closed) {
        return cb(new Error('Pool is closed.'));
      }
      if (err) {
        return cb(err);
      }

      this.emit('connection', connection);
      return cb(null, connection);
    }.bind(this));
  }

  if (!this.config.waitForConnections) {
    return process.nextTick(function(){
      return cb(new Error('No connections available.'));
    });
  }

  if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
    return cb(new Error('Queue limit reached.'));
  }

  if (cb && process.domain)
    cb = process.domain.bind(cb);
  this._connectionQueue.push(cb);
};

Pool.prototype.acquireConnection = function acquireConnection(connection, cb) {
  if (connection._pool !== this) {
    throw new Error('Connection acquired from wrong pool.');
  }

  var pool = this;

  connection._pool = null;
  connection.ping({timeout: this.config.acquireTimeout}, function(err) {
    if (!err) {
      connection._pool = pool;
      cb(null, connection);
      return;
    }

    connection.destroy();
    pool._connectionQueue.unshift(cb);
    pool._removeConnection(connection);
  });
};

Pool.prototype.releaseConnection = function releaseConnection(connection) {
  var cb;

  if (connection._pool) {
    if (connection._pool !== this) {
      throw new Error('Connection released to wrong pool');
    }

    if (connection._purge) {
      // purge connection from pool
      this._purgeConnection(connection);
      return;
    } else if (this._freeConnections.indexOf(connection) !== -1) {
      // connection already in free connection pool
      // this won't catch all double-release cases
      throw new Error('Connection already released');
    } else {
      // add connection to end of free queue
      this._freeConnections.push(connection);
    }
  }

  while (this._closed && this._connectionQueue.length) {
    // empty the connection queue
    cb = this._connectionQueue.shift();

    process.nextTick(cb.bind(null, new Error('Pool is closed.')));
  }

  if (this._connectionQueue.length) {
    cb = this._connectionQueue.shift();

    this.getConnection(cb);
  }
};

Pool.prototype.end = function (cb) {
  this._closed = true;

  if (typeof cb != "function") {
    cb = function (err) {
      if (err) throw err;
    };
  }

  var calledBack        = false;
  var closedConnections = 0;
  var connection;

  var endCB = function(err) {
    if (calledBack) {
      return;
    }

    if (err || ++closedConnections >= this._allConnections.length) {
      calledBack = true;
      return cb(err);
    }
  }.bind(this);

  if (this._allConnections.length === 0) {
    return process.nextTick(endCB);
  }

  while (this._allConnections.length) {
    connection = this._allConnections[0];
    connection._pool = null;
    connection._realEnd(endCB);
    this._removeConnection(connection);
  }
};

Pool.prototype.query = function (sql, values, cb) {
  var query = Connection.createQuery(sql, values, cb);

  if (!(typeof sql === 'object' && 'typeCast' in sql)) {
    query.typeCast = this.config.connectionConfig.typeCast;
  }

  if (this.config.connectionConfig.trace) {
    // Long stack trace support
    query._callSite = new Error;
  }

  this.getConnection(function (err, conn) {
    if (err) {
      var cb = query._callback;
      cb && cb(err);
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

Pool.prototype._purgeConnection = function _purgeConnection(connection) {
  var pool = this;

  connection._realEnd(function(err) {
    if (err) {
      connection.destroy();
    }

    pool._removeConnection(connection);
  });
};

Pool.prototype._removeConnection = function(connection) {
  var index;

  connection._pool = null;

  if ((index = this._allConnections.indexOf(connection)) !== -1) {
    // Remove connection from all connections
    this._allConnections.splice(index, 1);
  }

  if ((index = this._freeConnections.indexOf(connection)) !== -1) {
    // Remove connection from free connections
    this._freeConnections.splice(index, 1);
  }

  this.releaseConnection(connection);
};

Pool.prototype.escape = function(value) {
  return mysql.escape(value, this.config.connectionConfig.stringifyObjects, this.config.connectionConfig.timezone);
};

Pool.prototype.escapeId = function escapeId(value) {
  return mysql.escapeId(value, false);
};
