var Util    = require('util');
var Element = require('./Element');

// "(filler) always 0x00"
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Handshake_Initialization_Packet

module.exports = Filler;
Util.inherits(Filler, Element);
function Filler(length) {
  Element.call(this);

  this.length = length;
}

Filler.prototype.copy = function(buffer, offset) {
  for (var i = 0; i < this.length; i++) {
    buffer[i + offset] = 0x00;
  }
};

Filler.prototype.parse = function(buffer, start, end) {
  while (start < end) {
    if (buffer[start] !== 0x00) {
      throw new Error('Filler.InvalidByte: Expect 0x00, got: ' + buffer[start]);
    }

    start++;
    this.bytesWritten++;

    if (this.isDone()) {
      break;
    }
  }

  return start;
};

Filler.prototype.isDone = function() {
  return this.bytesWritten === this.length;
};
