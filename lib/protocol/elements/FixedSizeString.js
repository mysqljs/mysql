/*
 * Not documented as an element in the MySql protocol, but needed for some
 * packets. Represents a fixed size buffer / string.
 */

var Util          = require('util');
var Element       = require('./Element');
var StringDecoder = require('string_decoder').StringDecoder;

module.exports = FixedSizeString;
Util.inherits(FixedSizeString, Element);
function FixedSizeString(length, encoding, value) {
  if (value instanceof this.constructor) return value;

  Element.call(this);

  this.encoding = encoding;

  if (value === undefined) {
    this.value = (encoding)
      ? ''
      : new Buffer(length);
  } else {
    this.value = value;
  }

  if (length !== undefined && length !== null) {
    this.length = length;
  } else {
    this.length = (encoding)
      ? Buffer.byteLength(value, encoding)
      : value.length;
  }

  // Used when parsing strings
  this._stringDecoder = null;
}

FixedSizeString.prototype.copy = function(buffer, offset) {
  if (!this.encoding) {
    this.value.copy(buffer, offset);
    return;
  }

  buffer.write(this.value, offset, this.encoding);
};

FixedSizeString.prototype.parse = function(buffer, offset, end) {
  var remaining = this.length - this.bytesWritten;
  if (end - offset > remaining) {
    end = offset + remaining;
  }

  if (!this.encoding) {
    buffer.copy(this.value, this.bytesWritten, offset, end);
  } else {
    if (!this._stringDecoder) {
      this._stringDecoder = new StringDecoder(this.encoding);
    }

    buffer = buffer.slice(offset, end);
    this.value += this._stringDecoder.write(buffer);
  }

  this.bytesWritten += end - offset;

  return end;
};
