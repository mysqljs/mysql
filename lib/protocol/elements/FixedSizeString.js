/*
 * Not documented as an element in the MySql protocol, but needed for some
 * packets. Represents a fixed size buffer / string.
 */

var Util    = require('util');
var Element = require('./Element');

module.exports = FixedSizeString;
Util.inherits(FixedSizeString, Element);
function FixedSizeString(length, value) {
  if (value instanceof this.constructor) return value;

  Element.call(this);

  this.length = length;
  this.value  = new Buffer(length);

  // @TODO handle value argument (could be a buffer or utf-8 string)
}

// @TODO Implement copy if we need it

FixedSizeString.prototype.parse = function(buffer, start, end) {
  var remaining = this.length - this.bytesWritten;
  if (end - start > remaining) {
    end = start + remaining;
  }

  buffer.copy(this.value, this.bytesWritten, start, end);
  this.bytesWritten += end - start;

  return end;
};
