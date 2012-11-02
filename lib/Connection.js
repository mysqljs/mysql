var Net              = require('net');
var ConnectionConfig = require('./ConnectionConfig');
var Protocol         = require('./protocol/Protocol');
var SqlString        = require('./protocol/SqlString');
var EventEmitter     = require('events').EventEmitter;
var Util             = require('util');

module.exports = Connection;
Util.inherits(Connection, EventEmitter);
function Connection(options) {
  EventEmitter.call(this);

  this.config = options.config;

  this._socket        = options.socket;
  this._timezone      = options.config.timezone;
  this._protocol      = new Protocol({config: this.config});
  this._connectCalled = false;
}

Connection.prototype.connect = function(cb) {
  if (!this._connectCalled) {
    this._connectCalled = true;

    this._socket = (this.config.socketPath)
      ? Net.createConnection(this.config.socketPath)
      : Net.createConnection(this.config.port, this.config.host);

    this._socket.pipe(this._protocol);
    this._protocol.pipe(this._socket);

    this._socket.on('error', this._handleNetworkError.bind(this));
    this._protocol.on('unhandledError', this._handleProtocolError.bind(this));
    this._protocol.on('drain', this._handleProtocolDrain.bind(this));
    this._protocol.on('end', this._handleProtocolEnd.bind(this));
  }

  this._protocol.handshake(cb);
};

Connection.prototype.changeUser = function(options, cb){
  this._implyConnect();

  if (typeof options === 'function') {
    cb      = options;
    options = {};
  }

  var charsetNumber = (options.charset)
    ? Config.getCharsetNumber(options.charset)
    : this.config.charsetNumber;

  return this._protocol.changeUser({
    user          : options.user || this.config.user,
    password      : options.password || this.config.password,
    database      : options.database || this.config.database,
    charsetNumber : charsetNumber,
    currentConfig : this.config
  }, cb);
};

Connection.prototype.query = function(sql, values, cb) {
  this._implyConnect();

  var options = {};

  if (typeof sql === 'object') {
    // query(options, cb)
    options = sql;
    cb      = values;
    values  = options.values;

    delete options.values;
  } else if (typeof values === 'function') {
    // query(sql, cb)
    cb          = values;
    options.sql = sql;
    values      = undefined;
  } else {
    // query(sql, values, cb)
    options.sql    = sql;
    options.values = values;
  }

  options.sql = this.format(options.sql, values || []);
  options.timeZone = this._timezone;

  if (!('typeCast' in options)) {
    options.typeCast = this.config.typeCast;
  }

  return this._protocol.query(options, cb);
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

Connection.prototype.pause = function() {
  this._socket.pause();
  this._protocol.pause();
};

Connection.prototype.resume = function() {
  this._socket.resume();
  this._protocol.resume();
};

Connection.prototype.escape = function(value) {
  return SqlString.escape(value, true, this._timezone);
};

Connection.prototype.format = function(sql, values) {
  return SqlString.format(sql, values, this._timezone);
};

Connection.prototype._handleNetworkError = function(err) {
  this._protocol.handleNetworkError(err);
};

Connection.prototype._handleProtocolError = function(err) {
  this.emit('error', err);
};

Connection.prototype._handleProtocolDrain = function(err) {
  this.emit('drain', err);
};

Connection.prototype._handleProtocolEnd = function(err) {
  this.emit('end', err);
};

Connection.prototype._implyConnect = function() {
  if (!this._connectCalled) {
    this.connect();
  }
};
