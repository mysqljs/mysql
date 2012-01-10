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

// @TODO Throw error if this was not the first sequence being enqueued.
Protocol.prototype.authenticate = function(credentials, cb) {
  var self = this;
  var sequence = new Sequences.Handshake(credentials);
  sequence
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
      self._next();
    })
    .start();

  this._enqueue(sequence);
};

Protocol.prototype.query = function(sql, callback) {
  var self = this;
  var sequence = new Sequences.Query({
    sql: sql,
  });

  sequence
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
      self._next();
    });

  this._queue.push(sequence);
  return sequence;
};

// TODO: Extract Queue into own class
Protocol.prototype._next = function() {
  this._queue.shift();

  var sequence = this._queue[0];
  if (!sequence) return;

  sequence.start();
};

Protocol.prototype._enqueue = function(sequence) {
  this._queue.push(sequence);
};
