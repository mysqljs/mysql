var Parser       = require('./Parser');
var Sequences    = require('./sequences');
var Auth         = require('./Auth');
var Stream       = require('stream').Stream;
var Util         = require('util');

module.exports = Protocol;
Util.inherits(Protocol, Stream);
function Protocol(options) {
  Stream.call(this);

  options = options || {};

  this.readable = true;
  this.writable = true;

  this._parser = new Parser();

  this._config   = null;
  this._callback = null;

  this._queue = [];
}

Protocol.prototype.write = function(buffer) {
  // @TODO Try..catch and handle errors
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function(options, cb) {
  this._enqueue(Sequences.Handshake, cb, options);
};

Protocol.prototype.query = function(options, cb) {
  this._enqueue(Sequences.Query, cb, options);
};

Protocol.prototype.end = function(cb) {
  this._enqueue(Sequences.End, cb);
};

Protocol.prototype._enqueue = function(Sequence, options, cb) {
  var sequence = new Sequence(this._parser, options, cb);

  this._queue.push(sequence);

  if (this._queue.length === 1) {
    this._start(sequence);
  }
};

Protocol.prototype._start = function(sequence) {
  var self = this;

  sequence
    .on('data', function(buffer) {
      self.emit('data', buffer);
    })
    .on('end', function() {
      self._dequeue();
    });

  sequence.start();
  this._parser.setPacketHandler(sequence.handlePacket.bind(sequence));
};

Protocol.prototype._dequeue = function() {
  this._queue.shift();

  var sequence = this._queue[0];
  if (sequence) {
    this._start(sequence);
  }
};

Protocol.prototype.destroy = function(err) {
  if (!err) return;

  this._queue.forEach(function(sequence) {
    sequence.end(err);
  });
};
