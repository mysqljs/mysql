var mysql        = require('../');
var Connection   = require('./Connection');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

module.exports = Pool;

Util.inherits(Pool, EventEmitter);
function Pool(options) {
  EventEmitter.call(this);
  this.config = options.config;

  this._allConnections   = [];
  this._allConnectionsLength = 0;
  this._freeConnections  = [];
  this._connectionQueue  = [];
  this._closed           = false;
  this._initialized      = false;

  this._initialize();
}

Pool.prototype.getConnection = function (cb) {
  if (this._closed) {
    return this._raiseErrorToCB(cb, 'Pool is closed.');
  }

  if (!this._initialized) {
    return this.once('initialized', this.getConnection.bind(this, cb));
  }

  var connection;

  if (this._freeConnections.length > 0) {
    connection = this._freeConnections.shift();
    return cb(null, connection);
  }

  if (this.config.connectionLimit === 0 || this._allConnectionsLength < this.config.connectionLimit) {
    connection = this._createConnection();

    this._allConnectionsLength++;

    return connection.connect(function(err) {
      if (this._closed) {
        return this._raiseErrorToCB(cb, 'Pool is closed.');
      }
      if (err) {
        this._allConnectionsLength--;
        return this._raiseErrorToCB(cb, err);
      }

      this._allConnections.push(connection);
      this.emit('connection', connection);
      return cb(null, connection);
    }.bind(this));
  }

  if (!this.config.waitForConnections) {
    return this._raiseErrorToCB(cb, 'No connections available.');
  }

  if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
    return this._raiseErrorToCB(cb, 'Queue limit reached.');
  }

  this._connectionQueue.push(cb);
};

Pool.prototype.releaseConnection = function (connection) {
  var cb;

  connection.reset();

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

  if (typeof cb !== 'function') {
    cb = function(err) {
      if (err) throw err;
    };
  }

  if (this._allConnectionsLength === 0) {
    return cb(null);
  }

  var calledBack        = false;
  var closedConnections = 0;
  var connection;

  var endCB = function(err) {
    if (calledBack) {
      return;
    }

    if (err || ++closedConnections >= this._allConnectionsLength) {
      calledBack = true;
      delete endCB;
      return cb(err);
    }
  };

  for (var i = 0; i < this._allConnectionsLength; i++) {
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

Pool.prototype._raiseErrorToCB = function (cb, message) {
  cb(typeof message === 'string' ? new Error(message) : message);
};

Pool.prototype._initialize = function () {
  this.setMaxListeners(0);

  // create initial connections
  var initialSize = this.config.initialSize;
  if (initialSize <= 0) {
    this._initialized = true;
    return process.nextTick(this.emit.bind(this, 'initialized'));
  }

  var self = this;

  var attemptedConnect = 0;

  for (var i = 0; i < initialSize; i++) {
    (function () {
      var connection = self._createConnection();

      connection.connect(function(err) {
        if (!err) {
          self._allConnectionsLength++;
          self._allConnections.push(connection);
          self._freeConnections.push(connection);

          self.emit('connection', connection);
        }

        if (++attemptedConnect === initialSize) {
          self._initialized = true;
          self.emit('initialized', self._allConnectionsLength);
        }
      });
    })();
  }
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
  var i, len;

  connection._poolRemoved = true;

  for (i = 0, len = this._allConnections.length; i < len; i++) {
    if (this._allConnections[i] === connection) {
      this._allConnectionsLength--;
      this._allConnections.splice(i, 1);
      break;
    }
  }

  for (i = 0, len = this._freeConnections.length; i < len; i++) {
    if (this._freeConnections[i] === connection) {
      this._freeConnections.splice(i, 1);
      break;
    }
  }

  connection.end     = connection._realEnd;
  connection.destroy = connection._realDestroy;

  this.releaseConnection(connection);
};
