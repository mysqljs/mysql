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
  this._register(sequence, cb);
  sequence.start();

  this._enqueue(sequence);
};

Protocol.prototype.query = function(sql, cb) {
  var self = this;
  var sequence = new Sequences.Query({
    sql: sql,
  });

  this._register(sequence, cb);

  this._queue.push(sequence);
  return sequence;
};

Protocol.prototype._register = function(sequence, cb) {
  var self = this;
  sequence
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
      self._next();
    })
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
