var Util         = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(options) {
  EventEmitter.call(this);

  this.bytesWritten = 0;

  this._parser = options.parser;
}

Sequence.prototype.start = function() {
  throw new Error(
    'Sequence.IncompleteInterface: All Sequence classes must implement ' +
    '#start().'
  );
};

Sequence.prototype.handle = function(packet) {
  throw new Error(
    'Sequence.IncompleteInterface: All Sequence classes must implement ' +
    '#write().'
  );
};
