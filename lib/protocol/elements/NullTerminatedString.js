var Util          = require('util');
var Element       = require('./Element');
var StringDecoder = require('string_decoder').StringDecoder;
var GrowingBuffer = require('../util/GrowingBuffer');

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
  this._decoder = null;
  this._growingBuffer = null;
}

NullTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.value, offset, this.encoding);
  buffer[offset + this.length - 1] = 0x00;
};

NullTerminatedString.prototype.write = function(buffer, start, end) {
  return (this.encoding)
    ? this._stringWrite(buffer, start, end)
    : this._bufferWrite(buffer, start, end);
};

// @TODO Refactor the two private methods below into internal collaborator
// classes.

NullTerminatedString.prototype._stringWrite = function(buffer, start, end) {
  if (!this._decoder) this._decoder = new StringDecoder(this.encoding);

  var terminate = false;
  for (var i = start; i < end; i++) {
    if (buffer[i] === 0x00) {
      end       = i;
      terminate = true;
      break;
    }
  }

  var characters = this._decoder.write(buffer.slice(start, end));

  if (this.value === undefined) {
    this.value = characters;
  } else {
    this.value += characters;
  }

  var length = end - start;
  if (terminate) length += 1;

  this.bytesWritten += length;
  if (!terminate) return false;

  this.length = this.bytesWritten;
  return true;
};

NullTerminatedString.prototype._bufferWrite = function(buffer, start, end) {
  if (!this._growingBuffer) this._growingBuffer = new GrowingBuffer();

  // @TODO De-duplicate
  var terminate = false;
  for (var i = start; i < end; i++) {
    if (buffer[i] === 0x00) {
      end       = i;
      terminate = true;
      break;
    }
  }

  this._growingBuffer.append(buffer.slice(start, end));

  var length = end - start;
  if (terminate) length += 1;

  this.bytesWritten += length;
  if (!terminate) return false;

  this.length = this.bytesWritten;
  this.value  = this._growingBuffer.toBuffer();

  return true;
};
