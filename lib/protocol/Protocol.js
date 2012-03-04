var _            = require('underscore');
var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Sequences    = require('./sequences');
var Parser       = require('./Parser');

module.exports = Protocol;
Util.inherits(Protocol, EventEmitter);
function Protocol() {
  this._queue  = [];
  this._parser = new Parser();
}

Protocol.prototype.write = function(buffer) {
  return this._parser.parse(buffer);
};

// @TODO Throw error if this was not the first sequence being enqueued.
Protocol.prototype.handshake = function(credentials, cb) {
  this._enqueue(Sequences.Handshake, credentials, cb);

};

Protocol.prototype.query = function(sql, cb) {
  //var self = this;
  //var sequence = new Sequences.Query({
    //sql: sql,
  //});

  //this._register(sequence, cb);

  //this._queue.push(sequence);
  //return sequence;
};

Protocol.prototype._next = function() {
  var sequence = this._queue.shift();
  if (!sequence) return;

  sequence.start();
};

Protocol.prototype._enqueue = function(Sequence, options, cb) {
  var self     = this;
  var options  = _.extend({}, options, {parser: this._parser});
  var sequence = new Sequence(options);

  sequence
    .on('packet', function(packet) {
      self.emit('data', packet.toBuffer());
    })
    .on('end', function() {
      cb(null);
      self._next();
    })

  this._queue.push(sequence);
  if (this._queue.length === 1) {
    this._next();
  }
};
