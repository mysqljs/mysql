var mysql        = require('../');
var Connection   = require('./Connection');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');
var PoolManager  = require('./PoolExtension').PoolManager;
var PoolConnection  = require('./PoolExtension').PoolConnection;

module.exports = Pool;

Util.inherits(Pool, EventEmitter);
function Pool(options) {
  EventEmitter.call(this);
  this.config = options.config;

  this._allConnections   = new PoolConnection.All();
  this._freeConnections  = new PoolConnection.Free();
  this._connectionQueue  = new PoolConnection.Queue(this);
  this._poolManager      = new PoolManager(this);
  this._closed           = false;

  this._initialize();
}

Pool.prototype.getConnection = function (cb) {
  if (this._closed) {
    return process.nextTick(this._raiseErrorToCB.bind(this, cb, 'Pool is closed.'));
  }

  if (this._poolManager.isNotStarted()) {
    this._connectionQueue.add(cb);
    return;
  }

  var connection = this._freeConnections.get();
  if (connection) {
    return process.nextTick(cb.bind(null, null, connection));
  }

  if (this.config.connectionLimit === 0 || this._allConnections.length() < this.config.connectionLimit) {
    connection = this._createConnection();

    this._allConnections.incrLength();

    return this._poolManager.connect(connection, function(err) {
      if (this._closed) {
        return this._raiseErrorToCB(cb, 'Pool is closed.');
      }
      if (err) {
        this._allConnections.decrLength();
        return this._raiseErrorToCB(cb, err);
      }

      this._allConnections.add(connection);

      this.emit('connection', connection);

      return cb(null, connection);
    }.bind(this));
  }

  if (!this.config.waitForConnections) {
    return process.nextTick(this._raiseErrorToCB.bind(this, cb, 'No connections available.'));
  }

  if (this.config.queueLimit && this._connectionQueue.length() >= this.config.queueLimit) {
    return this._raiseErrorToCB(cb, 'Queue limit reached.');
  }

  this._connectionQueue.add(cb);
};

Pool.prototype.releaseConnection = function (connection) {
  var cb;

  connection.reset();

  if (connection._poolRemoved) {
    // The connection has been removed from the pool and is no longer good.
    cb = this._connectionQueue.get();
    if (cb) {
      process.nextTick(this.getConnection.bind(this, cb));
    }
  } else if ((cb = this._connectionQueue.get())) {
    process.nextTick(cb.bind(null, null, connection));
  } else {
    this._freeConnections.add(connection);
  }
};

Pool.prototype.end = function (cb) {
  if (this._poolManager.isNotStarted()) {
    return this._poolManager.afterStarted(this.end.bind(this, cb));
  }

  if (this._closed) {
    return this._raiseErrorToCB(cb, 'Pool is closing');
  }

  this._closed = true;

  this._poolManager.end();

  if (typeof cb !== 'function') {
    cb = function(err) {
      if (err) throw err;
    };
  }

  if (this._allConnections.length() === 0) {
    return cb(null);
  }

  var calledBack        = false;
  var closedConnections = 0;
  var connection;

  var endCB = function(err) {
    if (calledBack) {
      return;
    }

    if (err || ++closedConnections >= this._allConnections.length()) {
      calledBack = true;
      return cb(err);
    }
  }.bind(this);

  this._allConnections.each(function(connection) {
    connection.destroy = connection._realDestroy;
    connection.end     = connection._realEnd;
    connection.end(endCB);
  });
};

Pool.prototype.query = function (sql, values, cb) {
  if (typeof values === 'function') {
    cb = values;
    values = null;
  }

  this.getConnection(function (err, conn) {
    if (err) return cb(err);

    conn.query(sql, values, function () {
      conn.end();
      cb.apply(this, arguments);
    });
  });
};

Pool.prototype.getFreeSize = function () {
  return this._freeConnections.length();
};

Pool.prototype._createConnection = function() {
  var self = this;
  var connection = (this.config.createConnection)
    ? this.config.createConnection(this.config.connectionConfig)
    : mysql.createConnection(this.config.connectionConfig);

  connection._realEnd = connection.end;
  connection.end      = function(cb) {
    self.releaseConnection(connection);
    if (cb) cb();
  };

  connection._realDestroy = connection.destroy;
  connection.destroy      = function() {
    self._removeConnection(connection);
    connection.destroy();
  };

  // When a fatal error occurs the connection's protocol ends, which will cause
  // the connection to end as well, thus we only need to watch for the end event
  // and we will be notified of disconnects.
  connection.on('end', this._handleConnectionEnd.bind(this, connection));
  connection.on('error', this._handleConnectionError.bind(this, connection));

  connection._id = this._allConnections.getId();

  return connection;
};

Pool.prototype._removeConnection = function(connection, isFromIdleCheck) {
  isFromIdleCheck = isFromIdleCheck || false;

  connection._poolRemoved = true;
  connection.end     = connection._realEnd;
  connection.destroy = connection._realDestroy;

  this._allConnections.remove(connection);

  if (isFromIdleCheck) {
    connection.end();
  } else {
    this._freeConnections.remove(connection);
  }
};

Pool.prototype._handleConnectionEnd = function(connection) {
  if (this._closed || connection._poolRemoved) {
    return;
  }
  this._removeConnection(connection);
};

Pool.prototype._handleConnectionError = function(connection) {
  if (this._closed || connection._poolRemoved) {
    return;
  }
  this._removeConnection(connection);
};

Pool.prototype._raiseErrorToCB = function(cb, message) {
  if (typeof cb === 'function' && cb._PE_CALLED === undefined) {
    cb._PE_CALLED = true;
    cb(typeof message === 'string' ? new Error(message) : message);
  }
};

Pool.prototype._initialize = function() {
  this._poolManager.afterStarted(function() {
    this._connectionQueue.each(this.getConnection.bind(this));
  }.bind(this));

  this._poolManager.start();
};
