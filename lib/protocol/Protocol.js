var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Sequences    = require('./sequences');

module.exports = Protocol;
Util.inherits(Protocol, EventEmitter);
function Protocol() {
  this._handshake = null;
}

Protocol.prototype.write = function(buffer) {
  if (!this._handshake) return 0;

  var bytesWritten = this._handshake.write(buffer, 0, buffer.length);

  return bytesWritten;
};

Protocol.prototype.authenticate = function(credentials, cb) {
  var self = this;

  this._handshake = new Sequences.Handshake(credentials);
  this._handshake
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
    })
    .start();
};
