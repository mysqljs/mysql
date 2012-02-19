var Util         = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence() {
  EventEmitter.call(this);

  this.bytesWritten = 0;

  // The packet being currently parsed, used by #write
  this._expectedPacket = null;
}

// Parses [start...range] inside the buffer and returns the number of bytes
// parsed. May throw an exception if buffer contains unexpected data.
Sequence.prototype.write = function(buffer, start, end) {
  var offset = start;
  while (offset < end) {
    var packet = this._expectedPacket;
    if (!packet) break;

    var bytesWrittenBefore = packet.bytesWritten;
    var complete           = packet.parse(buffer, offset, end);
    var bytesWritten       = packet.bytesWritten - bytesWrittenBefore;
    this.bytesWritten     += bytesWritten;

    if (complete) this.handle(packet);

    offset += bytesWritten;
  }

  return offset - start;
};

Sequence.prototype.expect = function(packet) {
  this._expectedPacket = packet;
};

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
