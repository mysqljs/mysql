var Util    = require('util');
var Element = require('./Element');

// "Null-Terminated String: used for some variable-length character strings.
// The value '\0' (sometimes written 0x00) denotes the end of the string."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = NullTerminatedString;
Util.inherits(NullTerminatedString, Element);
function NullTerminatedString(string) {
  Element.call(this);

  this.string = string;
  this.length = (typeof string === 'string')
    ? Buffer.byteLength(string, 'utf-8') + 1
    : 0;
}

NullTerminatedString.prototype.copy = function(buffer, offset) {
  if (this.string === '') return buffer[offset] = 0x00;

  buffer.write(this.string, offset, 'utf-8');
};
