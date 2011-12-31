var Util          = require('util');
var Element       = require('./Element');
var StringDecoder = require('string_decoder').StringDecoder;

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

  // A StringDecoder, created by #write as needed
  this._decoder = null;
}

NullTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.value, offset, this.encoding);
  buffer[offset + this.length - 1] = 0x00;
};

NullTerminatedString.prototype.write = function(buffer, start, end) {
  if (!this._decoder) this._decoder = new StringDecoder(this.encoding);

  var terminate = false;
  for (var i = start; i < end; i++) {
    if (buffer[i] === 0x00) {
      end       = i;
      terminate = true;
      break;
    }
  }

  var length     = end - start;
  var characters = this._decoder.write(buffer.slice(start, end));

  if (this.value === undefined) {
    this.value = characters;
  } else {
    this.value += characters;
  }

  if (terminate) length += 1;

  this.bytesWritten += length;
  if (!terminate) return false;

  this.length = this.bytesWritten;
  return true;
};
