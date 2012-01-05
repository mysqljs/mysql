var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Sequences    = require('./sequences');

module.exports = Protocol;
Util.inherits(Protocol, EventEmitter);
function Protocol() {
  this._queue = [];
}

Protocol.prototype.write = function(buffer) {
  var sequence = this._queue[0];
  if (!sequence) return 0;

  return sequence.write(buffer, 0, buffer.length);
};

Protocol.prototype.authenticate = function(credentials, cb) {
  var self = this;
  var sequence = new Sequences.Handshake(credentials);
  sequence
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
      self._queue.shift();
    })
    .start();

  this._queue.push(sequence);
};
