var Net      = require('net');
var Config   = require('./Config');
var Protocol = require('./protocol/Protocol');

module.exports = Connection;
function Connection(options) {
  this.config = new Config(options.config);

  this._socket   = options.socket;
  this._protocol = new Protocol();
}

Connection.prototype.connect = function(cb) {
  if (!this._socket) {
    this._socket = Net.createConnection(this.config.port, this.config.host);
  }

  this._socket.pipe(this._protocol);
  this._protocol.pipe(this._socket);

  this._protocol.handshake(this.config, cb);
};

Connection.prototype.query = function(sql, cb) {
  return this._protocol.query({
    sql: sql,
  }, cb);
};

Connection.prototype.end = function() {
  this._protocol.end();
};
