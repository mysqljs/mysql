var net              = require('net');
var util             = require('util');
var EventEmitter     = require('events').EventEmitter;
var ServerConnection = require('./ServerConnection');

module.exports = Server;
util.inherits(Server, EventEmitter);
function Server(options) {
  EventEmitter.call(this);

  this._netServer   = null;
  this._connections = [];

  if (options.onConnection) this.on('connection', options.onConnection);
}

Server.prototype.listen = function(port, cb) {
  this._netServer = net.createServer(this._handleConnection.bind(this));

  var self = this;

  this._netServer
    .on('error', function(err) {
      if (cb) {
        cb(err);
        cb = null;
      } else {
        self.emit('error', err);
      }
    })
    .listen(port, function() {
      cb(null);
      cb = null;
    });
};

Server.prototype.close = function() {
  this._netServer.close()
};

Server.prototype._handleConnection = function(socket) {
  var connection = new ServerConnection({socket: socket});
  this._connections.push(connection);
  this.emit('connection', connection);
};
