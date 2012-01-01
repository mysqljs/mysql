var Util         = require('util');
var Element      = require('./Element');
var StringWriter = require('../util/StringWriter');
var BufferWriter = require('../util/BufferWriter');

// "Null-Terminated String: used for some variable-length character strings.
// The value '\0' (sometimes written 0x00) denotes the end of the string."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = NullTerminatedString;
Util.inherits(NullTerminatedString, Element);
function NullTerminatedString(encoding, value) {
  Element.call(this);

  this.encoding = encoding;
  this.value    = value;

  if (value === undefined) {
    this.length = undefined;
  } else if (!encoding) {
    this.length = value.length;
  } else {
    this.length = Buffer.byteLength(value, encoding) + 1;
  }

  // Created by #write as needed
  this._writer = null;
}

// NOTE: Only works for string values right now, not buffers
NullTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.value, offset, this.encoding);
  buffer[offset + this.length - 1] = 0x00;
};

NullTerminatedString.prototype.write = function(buffer, start, end) {
  if (!this._writer) {
    this._writer = (this.encoding)
      ? new StringWriter(this.encoding)
      : new BufferWriter();
  }

  var nullIndex = NullTerminatedString.indexOfNullByte(buffer, start, end);
  var lastWrite = (nullIndex !== undefined);

  if (lastWrite) end = nullIndex;
  buffer = buffer.slice(start, end);

  this.value = this._writer.write(buffer, lastWrite);

  var length = buffer.length;
  if (lastWrite) length += 1;

  this.bytesWritten += length;
  if (lastWrite) this.length = this.bytesWritten;

  return lastWrite;
};

NullTerminatedString.indexOfNullByte = function(buffer, start, end) {
  for (var i = start; i < end; i++) {
    if (buffer[i] === 0x00) return i;
  }
};
