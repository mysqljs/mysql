var Net          = require('net');
var Config       = require('./Config');
var Protocol     = require('./protocol/Protocol');
var SqlString    = require('./protocol/SqlString');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

module.exports = Connection;
Util.inherits(Connection, EventEmitter);
function Connection(options) {
  EventEmitter.call(this);

  this.config = new Config(options.config);

  this._socket        = options.socket;
  this._protocol      = new Protocol({config: this.config});
  this._connectCalled = false;
}

Connection.prototype.connect = function(cb) {
  this._connectCalled = true;

  if (!this._socket) {
    this._socket = Net.createConnection(this.config.port, this.config.host);
  }

  this._socket.pipe(this._protocol);
  this._protocol.pipe(this._socket);

  this._socket.on('error', this._handleNetworkError.bind(this));
  this._protocol.on('unhandledError', this._handleProtocolError.bind(this));

  this._protocol.handshake(cb);
};

Connection.prototype.query = function(sql, cb) {
  this._implyConnect();

  return this._protocol.query({
    sql      : sql,
    typeCast : this.config.typeCast,
  }, cb);
};

Connection.prototype.end = function(cb) {
  this._implyConnect();
  this._protocol.quit(cb);
};

Connection.prototype.destroy = function() {
  this._implyConnect();
  this._socket.destroy();
  this._protocol.destroy();
};

Connection.prototype.escape = function(value) {
  return SqlString.escape(value);
};

Connection.prototype._handleNetworkError = function(err) {
  this._protocol.handleNetworkError(err);
};

Connection.prototype._handleProtocolError = function(err) {
  this.emit('error', err);
};

Connection.prototype._implyConnect = function() {
  if (!this._connectCalled) {
    this.connect();
  }
};
