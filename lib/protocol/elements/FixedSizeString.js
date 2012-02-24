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
  var length    = this.length;
  var available = end - start;

  if (available < length) length = available;

  buffer.copy(this.value, this.bytesWritten, start, start + length);
  this.bytesWritten += length;

  return this.bytesWritten === this.length;
};
