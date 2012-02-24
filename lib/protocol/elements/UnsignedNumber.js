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

UnsignedNumber.prototype.parse = function(buffer, start, end) {
  var length       = this.length;
  var bytesWritten = this.bytesWritten

  while (true) {
    var index = start + bytesWritten;

    if (bytesWritten === 0) {
      this.value = buffer[index];
    } else {
      this.value += buffer[index] * Math.pow(256, bytesWritten);
    }

    bytesWritten++;
    if (bytesWritten === length) break;
    if (index >= end) break;
  }

  this.bytesWritten = bytesWritten;
  return bytesWritten === length;
};
