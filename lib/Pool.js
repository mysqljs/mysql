
var Mysql        = require('../');
var Connection   = require('./Connection');

module.exports = Pool;
function Pool(options) {
  this.config = options.config;
  this.config.connectionConfig.pool = this;

  this._allConnections   = [];
  this._freeConnections  = [];
  this._connectionQueue  = [];
  this._closed           = false;
}

Pool.prototype.getConnection = function(cb) {
  if (this._closed) {
    cb(new Error('Pool is closed.'));
    return;
  }

  if (this._freeConnections.length > 0) {
    var connection = this._freeConnections[0];
    this._freeConnections.shift();
    cb(null, connection);
  } else if (this.config.connectionLimit == 0 || this._allConnections.length < this.config.connectionLimit) {
    var self       = this;
    var connection = this._createConnection();
    this._allConnections.push(connection);
    connection.connect(function(err) {
      if (self._closed) {
        cb(new Error('Pool is closed.'));
      }
      else if (err) {
        cb(err);
      } else {
        cb(null, connection);
      }
    });
  } else if (this.config.waitForConnections) {
    this._connectionQueue.push(cb);
  } else {
    cb(new Error('No connections available.'));
  }
};

Pool.prototype.releaseConnection = function(connection) {
  if (this._connectionQueue.length) {
    var cb = this._connectionQueue[0];
    this._connectionQueue.shift();
    process.nextTick(cb.bind(null, null, connection));
  } else {
    this._freeConnections.push(connection);
  }
};

Pool.prototype.end = function(cb) {
  this._closed = true;
  var self              = this;
  var closedConnections = 0;
  var calledBack        = false;
  var endCB = function(err) {
    if (calledBack) {
      return;
    } else if (err) {
      calledBack = true;
      delete endCB;
      if (cb) cb(err);
    } else if (++closedConnections >= self._allConnections.length) {
      calledBack = true;
      delete endCB;
      if (cb) cb();
    }
  };

  if (this._allConnections.length == 0) {
    endCB();
    return;
  }

  for (var i = 0; i < this._allConnections.length; ++i) {
    var connection = this._allConnections[i];
    connection.destroy = connection._realDestroy;
    connection.end     = connection._realEnd;
    connection.end(endCB);
  }
};

Pool.prototype._createConnection = function() {
  var self = this;
  var connection = (this.config.createConnection)
    ? this.config.createConnection(this.config.connectionConfig)
    : Mysql.createConnection(this.config.connectionConfig);

  connection._realEnd = connection.end;
  connection.end      = function(cb) {
    self.releaseConnection(connection);
    if (cb) cb();
  };
  connection._realDestroy = connection.destroy;
  connection.destroy      = function() {
    for (var i = 0; i < self._allConnections.length; ++i) {
      if (self._allConnections[i] === this) {
        self._allConnections.splice(i, 1);
        break;
      }
    }
    this.end     = this._realEnd;
    this.destroy = this._realDestroy;
    this.destroy();
  };
  return connection;
};
