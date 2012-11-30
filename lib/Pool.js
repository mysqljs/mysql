
var Mysql        = require('../');
var Connection   = require('./Connection');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

module.exports = Pool;
Util.inherits(Pool, EventEmitter);
function Pool(options) {
  EventEmitter.call(this);

  this.config = options.config;
  this.config.connectionConfig.pool = this;

  this._createConnection = this.config.createConnection || Mysql.createConnection;
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
    var connection = this._createConnection(this.config.connectionConfig);
    this._allConnections.push(connection);
    connection.connect(function(err) {
      if (err) {
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
      cb(err);
    } else if (++closedConnections == self._allConnections.length) {
      calledBack = true;
      delete endCB;
      cb();
    }
  };
  for (var i = 0; i < this._allConnections.length; ++i) {
    this._allConnections[i].end(endCB);
  }
};
