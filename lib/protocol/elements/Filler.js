var Util    = require('util');
var Element = require('./Element');

// "(filler) always 0x00"
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Handshake_Initialization_Packet

module.exports = Filler;
Util.inherits(Filler, Element);
function Filler(length, expectedValue) {
  Element.call(this);

  this.length         = length;
  this._expectedValue = expectedValue;
}

Filler.prototype.copy = function(buffer, offset) {
  for (var i = 0; i < this.length; i++) {
    buffer[i + offset] = 0x00;
  }
};

Filler.prototype.parse = function(buffer, start, end) {
  while (start < end) {
    if (this._expectedValue !== undefined && buffer[start] !== this._expectedValue) {
      throw new Error(
        'Filler.InvalidByte: Expected ' + this._expectedValue + ', got: ' +
        buffer[start]
      );
    }

    start++;
    this.bytesWritten++;

    if (this.isDone()) {
      break;
    }
  }

  return start;
};
