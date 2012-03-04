var Util    = require('util');
var Element = require('./Element');

// "All numbers are stored with the least significant byte first.
// All numbers are unsigned."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = UnsignedNumber;
Util.inherits(UnsignedNumber, Element);
function UnsignedNumber(length, value) {
  if (value instanceof this.constructor) return value;

  Element.call(this);

  this.length = length;
  this.value  = value;
}

UnsignedNumber.prototype.copy = function(buffer, offset) {
  var value = this.value;

  for (var i = 0; i < this.length; i++) {
    buffer[i + offset] = (value >> (i * 8)) & 0xff;
  }
};

UnsignedNumber.prototype.parse = function(buffer, offset, end) {
  while (offset < end) {
    var byte = buffer[offset];

    if (this.bytesWritten === 0) {
      this.value = byte
    } else {
      this.value += byte * Math.pow(256, this.bytesWritten);
    }

    this.bytesWritten++;
    offset++;

    if (this.bytesWritten === this.length) {
      break;
    }
  }

  return offset;
};
