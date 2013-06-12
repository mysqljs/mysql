var mysql        = require('../');
var Connection   = require('./Connection');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

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

    return process.nextTick(function(){
      return cb(null, connection);
    });
  }

  if (this.config.connectionLimit === 0 || this._allConnections.length < this.config.connectionLimit) {
    connection = this._createConnection();

    this._allConnections.push(connection);

    return connection.connect(function(err) {
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

  this._connectionQueue.push(cb);
};

Pool.prototype.releaseConnection = function (connection) {
  var cb;

  if (connection._poolRemoved) {
    // The connection has been removed from the pool and is no longer good.
    if (this._connectionQueue.length) {
      cb = this._connectionQueue.shift();

      process.nextTick(this.getConnection.bind(this, cb));
    }
  } else if (this._connectionQueue.length) {
    cb = this._connectionQueue.shift();

    process.nextTick(cb.bind(null, null, connection));
  } else {
    this._freeConnections.push(connection);
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
      delete endCB;
      return cb(err);
    }
  }.bind(this);

  if (this._allConnections.length === 0) {
    return endCB();
  }

  for (var i = 0; i < this._allConnections.length; i++) {
    connection = this._allConnections[i];

    connection.destroy = connection._realDestroy;
    connection.end     = connection._realEnd;
    connection.end(endCB);
  }
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

  return connection;
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

Pool.prototype._removeConnection = function(connection) {
  var i;

  connection._poolRemoved = true;

  for (i = 0; i < this._allConnections.length; i++) {
    if (this._allConnections[i] === connection) {
      this._allConnections.splice(i, 1);
      break;
    }
  }

  for (i = 0; i < this._freeConnections.length; i++) {
    if (this._freeConnections[i] === connection) {
      this._freeConnections.splice(i, 1);
      break;
    }
  }

  connection.end     = connection._realEnd;
  connection.destroy = connection._realDestroy;

  this.releaseConnection(connection);
};
