/*
 * see http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements
 */
var Util              = require('util');
var Element           = require('./Element');
var LengthCodedBinary = require('./LengthCodedBinary');
var FixedSizeString   = require('./FixedSizeString');

module.exports = LengthCodedString;
Util.inherits(LengthCodedString, Element);
function LengthCodedString(encoding, value) {
  if (value instanceof this.constructor) return value;
  Element.call(this);

  this.encoding = encoding;
  this.value    = value;

  if (value) {
    this._fixedSizeString   = new FixedSizeString(null, encoding, value);
    this._lengthCodedBinary = new LengthCodedBinary(this._fixedSizeString.length);

    this.length = this._fixedSizeString.length + this._lengthCodedBinary.length;
  } else {
    this._fixedSizeString   = undefined;
    this._lengthCodedBinary = new LengthCodedBinary();

    this.length             = undefined;
  }
}

LengthCodedString.prototype.copy = function(buffer, offset) {
  this._lengthCodedBinary.copy(buffer, offset);
  offset += this._lengthCodedBinary.length;

  this._fixedSizeString.copy(buffer, offset);
};

LengthCodedString.prototype.parse = function(buffer, offset, end) {
  if (!this._lengthCodedBinary.isDone()) {
    offset = this._lengthCodedBinary.parse(buffer, offset, end);

    var isDone = offset < end || this._lengthCodedBinary.isDone();
    if (!isDone) {
      return offset;
    }

    this.bytesWritten += this._lengthCodedBinary.bytesWritten;
    if (this._lengthCodedBinary.value === 0) {
      this.value  = '';
      this.length = this._lengthCodedBinary.length;
      return offset;
    }

    this._fixedSizeString = new FixedSizeString(this._lengthCodedBinary.value, this.encoding);
    this.length = this._lengthCodedBinary.length + this._lengthCodedBinary.value;
  }

  if (!this._fixedSizeString.isDone()) {
    offset = this._fixedSizeString.parse(buffer, offset, end);

    var isDone = offset < end || this._fixedSizeString.isDone();
    if (isDone) {
      this.value = this._fixedSizeString.value;
      this.bytesWritten += this._fixedSizeString.bytesWritten;
    }
  }

  return offset;
};
