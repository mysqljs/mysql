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

  if (value) {
    this._fixedSizeString   = new FixedSizeString(null, encoding, value);
    this._lengthCodedBinary = new LengthCodedBinary(this._fixedSizeString.length);
  } else {
    this._fixedSizeString   = undefined;
    this._lengthCodedBinary = undefined;
  }
}

LengthCodedString.prototype.__defineGetter__('length', function() {
  return (this._fixedSizeString && this._lengthCodedBinary)
    ? this._fixedSizeString.length + this._lengthCodedBinary.length
    : 0;
});

LengthCodedString.prototype.copy = function(buffer, offset) {
  this._lengthCodedBinary.copy(buffer, offset);
  offset += this._lengthCodedBinary.length;

  this._fixedSizeString.copy(buffer, offset);
};
