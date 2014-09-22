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

  this._acquiringConnections = [];
  this._allConnections       = [];
  this._freeConnections      = [];
  this._connectionQueue      = [];
  this._closed               = false;
}

Pool.prototype.getConnection = function (cb) {

  if (this._closed) {
    return process.nextTick(function(){
      return cb(new Error('Pool is closed.'));
    });
  }

  var connection;
  var pool = this;

  if (this._freeConnections.length > 0) {
    connection = this._freeConnections.shift();

    return this.acquireConnection(connection, cb);
  }

  if (this.config.connectionLimit === 0 || this._allConnections.length < this.config.connectionLimit) {
    connection = new PoolConnection(this, { config: this.config.newConnectionConfig() });

    this._acquiringConnections.push(connection);
    this._allConnections.push(connection);

    return connection.connect({timeout: this.config.acquireTimeout}, function onConnect(err) {
      spliceConnection(pool._acquiringConnections, connection);

      if (pool._closed) {
        err = new Error('Pool is closed.');
      }

      if (err) {
        pool._purgeConnection(connection);
        cb(err);
        return;
      }

      pool.emit('connection', connection);
      cb(null, connection);
    });
  }

  if (!this.config.waitForConnections) {
    return process.nextTick(function(){
      return cb(new Error('No connections available.'));
    });
  }

  this._enqueueCallback(cb);
};

Pool.prototype.acquireConnection = function acquireConnection(connection, cb) {
  if (connection._pool !== this) {
    throw new Error('Connection acquired from wrong pool.');
  }

  var pool = this;

  this._acquiringConnections.push(connection);

  connection.ping({timeout: this.config.acquireTimeout}, function onPing(err) {
    spliceConnection(pool._acquiringConnections, connection);

    if (pool._closed) {
      err = new Error('Pool is closed.');
    }

    if (err) {
      pool._connectionQueue.unshift(cb);
      pool._purgeConnection(connection);
      return;
    }

    cb(null, connection);
  });
};

Pool.prototype.releaseConnection = function releaseConnection(connection) {
  var cb;

  if (this._acquiringConnections.indexOf(connection) !== -1) {
    // connection is being acquired
    return;
  }

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

  var calledBack   = false;
  var waitingClose = this._allConnections.length;

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

  while (this._allConnections.length !== 0) {
    this._purgeConnection(this._allConnections[0], onEnd);
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

Pool.prototype._enqueueCallback = function _enqueueCallback(callback) {

  if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
    process.nextTick(function () {
      var err = new Error('Queue limit reached.');
      err.code = 'POOL_ENQUEUELIMIT';
      callback(err);
    });
    return;
  }

  // Bind to domain, as dequeue will likely occur in a different domain
  var cb = process.domain
    ? process.domain.bind(callback)
    : callback;

  this._connectionQueue.push(cb);
  this.emit('enqueue');
};

Pool.prototype._purgeConnection = function _purgeConnection(connection, callback) {
  var cb = callback || function () {};

  if (connection.state === 'disconnected') {
    connection.destroy();
  }

  this._removeConnection(connection);

  if (connection.state !== 'disconnected' && !connection._protocol._quitSequence) {
    connection._realEnd(cb);
    return;
  }

  process.nextTick(cb);
};

Pool.prototype._removeConnection = function(connection) {
  connection._pool = null;

  // Remove connection from all connections
  spliceConnection(this._allConnections, connection);

  // Remove connection from free connections
  spliceConnection(this._freeConnections, connection);

  this.releaseConnection(connection);
};

Pool.prototype.escape = function(value) {
  return mysql.escape(value, this.config.connectionConfig.stringifyObjects, this.config.connectionConfig.timezone);
};

Pool.prototype.escapeId = function escapeId(value) {
  return mysql.escapeId(value, false);
};

function spliceConnection(array, connection) {
  var index;
  if ((index = array.indexOf(connection)) !== -1) {
    // Remove connection from all connections
    array.splice(index, 1);
  }
}
