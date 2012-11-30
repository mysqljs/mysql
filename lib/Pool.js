
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

  this._createConnection     = this.config.createConnection || Mysql.createConnection;
  this._freeConnections      = [];
  this._connectionQueue      = [];
  this._totalConnectionCount = 0;
}

Pool.prototype.getConnection = function(cb) {
  if (this._freeConnections.length > 0) {
    var connection = this._freeConnections[0];
    this._freeConnections.shift();
    cb(null, connection);
  } else if (!this.config.connectionLimit || this._totalConnectionCount < this.config.connectionLimit) {
    var connection = this._createConnection(this.config.connectionConfig);
    ++this._totalConnectionCount;
    connection.connect(function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null, connection);
      }
    });
  } else if (this.config.waitForConnection) {
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
