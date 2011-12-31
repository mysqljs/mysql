var Util    = require('util');
var Element = require('./Element');

// "Null-Terminated String: used for some variable-length character strings.
// The value '\0' (sometimes written 0x00) denotes the end of the string."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = NullTerminatedString;
Util.inherits(NullTerminatedString, Element);
function NullTerminatedString(string) {
  Element.call(this);

  this.value = string;
  this.length = (typeof string === 'string')
    ? Buffer.byteLength(string, 'utf-8') + 1
    : 0;
}

NullTerminatedString.prototype.copy = function(buffer, offset) {
  if (this.value === '') return buffer[offset] = 0x00;

  buffer.write(this.value, offset, 'utf-8');
};

// @TODO Utf-8 support
NullTerminatedString.prototype.write = function(buffer, start, end) {
  var bytesWritten = this.bytesWritten
  var offset       = 0;

  while (true) {
    var index = start + offset;
    if (index >= end) break;

    var byte = buffer[index];
    if (byte === 0x00) {
      this.length = this.bytesWritten = bytesWritten + 1;
      if (this.length === 1) this.value = '';

      return true;
    }

    if (bytesWritten === 0) {
      this.value = String.fromCharCode(byte);
    } else {
      this.value += String.fromCharCode(byte);
    }

    bytesWritten++;
    offset++;
  }

  this.bytesWritten = bytesWritten;

  return false;
};
