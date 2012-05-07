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

  this._socket   = options.socket;
  this._protocol = new Protocol({config: this.config});
}

Connection.prototype.connect = function(cb) {
  if (!this._socket) {
    this._socket = Net.createConnection(this.config.port, this.config.host);
  }

  this._socket.pipe(this._protocol);
  this._protocol.pipe(this._socket);

  this._protocol.handshake(cb);

  this._socket.on('error', this._handleNetworkError.bind(this));
  this._protocol.on('unhandledError', this._handleProtocolError.bind(this));
};

Connection.prototype.query = function(sql, cb) {
  return this._protocol.query({
    sql      : sql,
    typeCast : this.config.typeCast,
  }, cb);
};

Connection.prototype.end = function() {
  this._protocol.end();
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
