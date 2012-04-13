var PacketHeader = require('./PacketHeader');

module.exports = Parser;
function Parser(options) {
  this._buffer = null;
  this._offset = 0;

  this._packetHeader = null;
}

Parser.prototype.write = function(buffer) {
  this._append(buffer);

  var self = this;
  var packetHeader = this._packetHeader;

  while (true) {
    if (!packetHeader) {
      if (this._bytesRemaining() < 4) {
        break;
      }

      packetHeader = new PacketHeader(
        this.readUnsignedNumber(3),
        this.readUnsignedNumber(1)
      );
    }

    if (this._bytesRemaining() < packetHeader.length) {
      break;
    }

    //this._offset += packetHeader.length;

    var id = this.readLengthCodedString();
    var name = this.readLengthCodedString();

    //console.log(packetHeader);

    packetHeader = null;
  }

  this._packetHeader = packetHeader;
};

Parser.prototype._bytesRemaining = function() {
  return this._buffer.length - this._offset;
};

Parser.prototype._append = function(newBuffer) {
  var oldBuffer = this._buffer;
  if (!oldBuffer) {
    this._buffer = newBuffer;
    return;
  }

  var bytesRemaining = this._bytesRemaining();
  var newLength = bytesRemaining + newBuffer.length;

  var combinedBuffer = (newLength < this._offset)
    ? oldBuffer.slice(0, newLength)
    : new Buffer(newLength);

  oldBuffer.copy(combinedBuffer, 0, this._offset);
  newBuffer.copy(combinedBuffer, bytesRemaining);

  this._buffer = combinedBuffer;
  this._offset = 0;
};

Parser.prototype.readUnsignedNumber = function(bytes) {
  var bytesRead = 0;
  var value     = 0;

  while (bytesRead < bytes) {
    var byte = this._buffer[this._offset + bytesRead];

    value += byte * Math.pow(256, bytesRead);

    bytesRead++;
  }

  this._offset += bytesRead;

  return value;
};

Parser.prototype.readLengthCodedString = function() {
  var length = this.readLengthCodedBinary();
  return this.readString(length);
};

Parser.prototype.readLengthCodedBinary = function() {
  var byte = this._buffer[this._offset];
  this._offset++;

  if (byte <= 251) {
    return (byte === 251)
      ? null
      : byte;
  }

  if (byte === 252) {
    var length = 2;
  } else {
    throw new Error('not implemented');
  }

  var value = 0;
  for (var bytesRead = 0; bytesRead < length; bytesRead++) {
    var byte = this._buffer[this._offset + bytesRead];
    value += Math.pow(256, bytesRead) * byte;
  }

  this._offset += bytesRead;
  return value;
};

Parser.prototype.readString = function(length) {
  var end = this._offset + length;
  var value = this._buffer.toString('utf-8', this._offset, end);

  this._offset = end;
  return value;
};

Parser.prototype.advance = function(bytes) {
  this._offset += bytes;
};


Parser.FIELD_TYPE_DECIMAL     = 0x00;
Parser.FIELD_TYPE_TINY        = 0x01;
Parser.FIELD_TYPE_SHORT       = 0x02;
Parser.FIELD_TYPE_LONG        = 0x03;
Parser.FIELD_TYPE_FLOAT       = 0x04;
Parser.FIELD_TYPE_DOUBLE      = 0x05;
Parser.FIELD_TYPE_NULL        = 0x06;
Parser.FIELD_TYPE_TIMESTAMP   = 0x07;
Parser.FIELD_TYPE_LONGLONG    = 0x08;
Parser.FIELD_TYPE_INT24       = 0x09;
Parser.FIELD_TYPE_DATE        = 0x0a;
Parser.FIELD_TYPE_TIME        = 0x0b;
Parser.FIELD_TYPE_DATETIME    = 0x0c;
Parser.FIELD_TYPE_YEAR        = 0x0d;
Parser.FIELD_TYPE_NEWDATE     = 0x0e;
Parser.FIELD_TYPE_VARCHAR     = 0x0f;
Parser.FIELD_TYPE_BIT         = 0x10;
Parser.FIELD_TYPE_NEWDECIMAL  = 0xf6;
Parser.FIELD_TYPE_ENUM        = 0xf7;
Parser.FIELD_TYPE_SET         = 0xf8;
Parser.FIELD_TYPE_TINY_BLOB   = 0xf9;
Parser.FIELD_TYPE_MEDIUM_BLOB = 0xfa;
Parser.FIELD_TYPE_LONG_BLOB   = 0xfb;
Parser.FIELD_TYPE_BLOB        = 0xfc;
Parser.FIELD_TYPE_VAR_STRING  = 0xfd;
Parser.FIELD_TYPE_STRING      = 0xfe;
Parser.FIELD_TYPE_GEOMETRY    = 0xff;
