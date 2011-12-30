// "Length Coded String: a variable-length string. Used instead of
// Null-Terminated String, especially for character strings which might contain
// '\0' or might be very long. The first part of a Length Coded String is a
// Length Coded Binary number (the length); the second part of a Length Coded
// String is the actual data. An example of a short Length Coded String is
// these three hexadecimal bytes: 02 61 62, which means "length = 2, contents
// = 'ab'".
//
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

var LengthCodedBinary = require('./LengthCodedBinary');

module.exports = LengthCodedString;
function LengthCodedString(value) {
  this.value  = value;
  this.length = Buffer.byteLength(value, 'utf-8');

  this._lengthCodedBinary = new LengthCodedBinary(this.length);
  this.length = this._lengthCodedBinary.length + this.length;
}

LengthCodedString.prototype.copy = function(buffer, offset) {
  this._lengthCodedBinary.copy(buffer, offset);

  offset += this._lengthCodedBinary.length;

  buffer.write(this.value, offset, 'utf-8');
};
