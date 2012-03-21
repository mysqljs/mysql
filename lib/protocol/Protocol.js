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

Object
  .keys(Sequences)
  .forEach(function(sequence) {
    var method = sequence.substr(0, 1).toLowerCase() + sequence.substr(1);
    Protocol.prototype[method] = function(options, cb) {
      this._enqueue(Sequences[sequence], options, cb);
    };
  });


Protocol.prototype._next = function() {
  var item = this._queue[0];
  if (!item) return;

  var self = this;
  item.sequence.execute(function(err) {
    if (err && err.fatal) {
      self.destroy(err);
    }

    item.callback.apply(null, arguments);

    self._queue.shift();
    self._next();
  });
};

Protocol.prototype._enqueue = function(Sequence, options, cb) {
  var self     = this;
  var options  = _.extend({}, options, {parser: this._parser});
  var sequence = new Sequence(options);

  sequence.on('packet', function(packet) {
    self.emit('data', packet.toBuffer());
  });

  this._queue.push({sequence: sequence, callback: cb});
  if (this._queue.length === 1) {
    this._next();
  }
};
